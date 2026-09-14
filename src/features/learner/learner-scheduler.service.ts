import cron from 'node-cron';
import { DEFAULT_TIMEZONE } from '@core/config';
import { getErrorMessage, getHourInTimezone, Logger } from '@core/utils';
import { notify } from '@services/notifier';
import { provideTelegramBot } from '@services/telegram';
import { REMINDER_HOURS } from './constants';
import { buildBiteMessage } from './learner.controller';
import { ANALYTIC_EVENT_NAMES, BOT_CONFIG } from './learner.config';
import { localDateKey, selectNextBite } from './learner-scheduler';
import { claimSlot, getActiveSubscriptions, getDeliveriesForDay, getProgress, setDeliveryMessageId } from './mongo';
import type { LearnerSubscription } from './types';

export class LearnerSchedulerService {
  private readonly logger = new Logger('learner:scheduler');
  private readonly bot = provideTelegramBot(BOT_CONFIG);

  init(): void {
    cron.schedule(
      `0 ${REMINDER_HOURS.join(',')} * * *`,
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
    if (deliveries.some((delivery) => delivery.slot === slot)) return; // already handled this slot today
    if (slot > 0 && !deliveries.some((delivery) => delivery.slot === slot - 1 && delivery.answered)) return; // previous slot unanswered → skip

    const doc = await getProgress(chatId);
    const progress = doc ?? { states: {}, streak: 0, lastStudyDate: null, updatedAt: null };
    const biteId = selectNextBite(progress);
    if (!biteId) return; // nothing due / nothing new

    const claimed = await claimSlot(chatId, dateKey, slot, biteId);
    if (!claimed) return; // another run beat us to this slot

    const message = buildBiteMessage(biteId);
    if (!message) return;

    const sent = await this.bot.api.sendMessage(chatId, message.text, { reply_markup: message.keyboard, parse_mode: 'Markdown' });
    await setDeliveryMessageId(chatId, dateKey, slot, sent.message_id);
    notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.REMINDER, slot: `${slot + 1}` });
  }
}
