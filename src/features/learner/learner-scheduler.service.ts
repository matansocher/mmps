import cron from 'node-cron';
import { DEFAULT_TIMEZONE } from '@core/config';
import { getErrorMessage, getHourInTimezone, Logger } from '@core/utils';
import { notify } from '@services/notifier';
import { provideTelegramBot } from '@services/telegram';
import { LEARNER_WELCOME_DELIVERY_SLOT, REMINDER_HOURS, REMINDER_MINUTE } from './constants';
import { buildBiteMessage } from './learner.controller';
import { ANALYTIC_EVENT_NAMES, BOT_CONFIG } from './learner.config';
import { localDateKey, selectNextBite } from './learner-scheduler';
import { claimSlot, getActiveSubscriptions, getDeliveriesForDay, getProgress, releaseClaimedSlot, setDeliveryMessageId } from './mongo';
import type { LearnerDelivery, LearnerSubscription } from './types';

export function canSendReminderForSlot(deliveries: ReadonlyArray<Pick<LearnerDelivery, 'slot' | 'answered'>>, slot: number): boolean {
  if (deliveries.some((delivery) => delivery.slot === slot)) return false;
  return slot === 0 || deliveries.some((delivery) => delivery.slot === slot - 1 && delivery.answered);
}

export class LearnerSchedulerService {
  private readonly logger = new Logger('learner:scheduler');
  private readonly bot = provideTelegramBot(BOT_CONFIG);

  init(): void {
    cron.schedule(
      `${REMINDER_MINUTE} ${REMINDER_HOURS.join(',')} * * *`,
      () => this.handleReminderTick(),
      { timezone: DEFAULT_TIMEZONE },
    );
  }

  async handleReminderTick(): Promise<void> {
    try {
      const currentHour = getHourInTimezone(DEFAULT_TIMEZONE);
      const slot = REMINDER_HOURS.indexOf(currentHour);
      if (slot === -1) return;

      const subscriptions = await getActiveSubscriptions();
      if (!subscriptions.length) return;

      await Promise.all(subscriptions.map((subscription) => this.remindOne(subscription, slot).catch((err) => this.logger.error(getErrorMessage(err)))));
    } catch (err) {
      notify(BOT_CONFIG, { action: `cron - ${ANALYTIC_EVENT_NAMES.ERROR}`, error: err });
    }
  }

  // One subscriber, one slot. Skip the slot when the previous one was not answered yet.
  private async remindOne(subscription: LearnerSubscription, slot: number): Promise<void> {
    const chatId = subscription._id;
    const dateKey = localDateKey();

    const deliveries = await getDeliveriesForDay(chatId, dateKey);
    if (!canSendReminderForSlot(deliveries, slot)) return;

    await this.deliverBite(chatId, slot);
  }

  // Send the next bite for a given daily slot. Idempotent: claiming the slot is a
  // compare-and-swap, so concurrent ticks (or an instant /start delivery racing the
  // 11:15 tick) converge on a single message. Returns whether a bite was sent.
  async deliverBite(chatId: number, slot: number): Promise<boolean> {
    const dateKey = localDateKey();

    const doc = await getProgress(chatId);
    const progress = doc ?? { states: {}, streak: 0, lastStudyDate: null, updatedAt: null };
    const biteId = selectNextBite(progress);
    if (!biteId) return false; // nothing due / nothing new

    const message = buildBiteMessage(biteId);
    if (!message) return false;

    const claimed = await claimSlot(chatId, dateKey, slot, biteId);
    if (!claimed) return false; // another run beat us to this slot

    let messageId: number;
    try {
      const sent = await this.bot.api.sendMessage(chatId, message.text, { reply_markup: message.keyboard, parse_mode: 'Markdown' });
      messageId = sent.message_id;
    } catch (err) {
      await releaseClaimedSlot(chatId, dateKey, slot).catch((releaseErr) => this.logger.error(`Failed to release reminder slot: ${getErrorMessage(releaseErr)}`));
      throw err;
    }

    // Keep the claimed slot if persistence fails after Telegram accepted the message;
    // retrying would send a duplicate notification.
    await setDeliveryMessageId(chatId, dateKey, slot, messageId);
    notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.REMINDER, slot: slot === LEARNER_WELCOME_DELIVERY_SLOT ? 'welcome' : `${slot + 1}` });
    return true;
  }

  // Track the welcome bite separately so the subscriber still receives the scheduled daily reminder.
  async sendFirstBiteNow(chatId: number): Promise<void> {
    const dateKey = localDateKey();
    const deliveries = await getDeliveriesForDay(chatId, dateKey);
    if (deliveries.some((delivery) => delivery.slot === LEARNER_WELCOME_DELIVERY_SLOT)) return;
    await this.deliverBite(chatId, LEARNER_WELCOME_DELIVERY_SLOT);
  }
}
