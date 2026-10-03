import { toZonedTime } from 'date-fns-tz';
import { type Bot, GrammyError, InlineKeyboard } from 'grammy';
import { DEFAULT_TIMEZONE } from '@core/config';
import { getErrorMessage, Logger } from '@core/utils';
import { notify } from '@services/notifier';
import { archiveSubscription, getActiveSubscriptions, getExpiredSubscriptions, getUserDetails, Subscription, WoltRestaurant } from '@shared/wolt';
import { restaurantsService } from './restaurants.service';
import {
  ANALYTIC_EVENT_NAMES,
  BOT_ACTIONS,
  BOT_CONFIG,
  HOUR_OF_DAY_TO_REFRESH_MAP,
  INLINE_KEYBOARD_SEPARATOR,
  MAX_HOUR_TO_ALERT_USER,
  MIN_HOUR_TO_ALERT_USER,
  SUBSCRIPTION_EXPIRATION_HOURS,
  SUBSCRIPTION_EXTENSION_HOURS,
} from './wolt.config';

export type AnalyticEventValue = (typeof ANALYTIC_EVENT_NAMES)[keyof typeof ANALYTIC_EVENT_NAMES];

const JOB_NAME = 'wolt-scheduler-job-interval';

export class WoltSchedulerService {
  private readonly logger = new Logger('wolt:scheduler');
  private timeouts: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private stopped = false;

  constructor(private readonly bot: Bot) {}

  stop(): void {
    this.stopped = true;
    for (const timeout of this.timeouts.values()) {
      clearTimeout(timeout);
    }
    this.timeouts.clear();
  }

  async scheduleInterval(): Promise<void> {
    if (this.stopped) return;

    const secondsToNextRefresh = HOUR_OF_DAY_TO_REFRESH_MAP[toZonedTime(new Date(), DEFAULT_TIMEZONE).getHours()];

    // Clear existing timeout if it exists
    const existingTimeout = this.timeouts.get(JOB_NAME);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    try {
      await this.handleIntervalFlow();
    } catch (err) {
      // A transient flow failure must never stop the loop - log and re-arm in finally
      this.logger.error(`Error in interval flow: ${getErrorMessage(err)}`);
    } finally {
      if (!this.stopped) {
        const timeout = setTimeout(() => {
          this.scheduleInterval().catch((err) => this.logger.error(`Error in scheduled interval: ${getErrorMessage(err)}`));
        }, secondsToNextRefresh * 1000);

        this.timeouts.set(JOB_NAME, timeout);
      }
    }
  }

  async handleIntervalFlow(): Promise<void> {
    await this.cleanExpiredSubscriptions();
    const subscriptions = (await getActiveSubscriptions()) as Subscription[];
    if (subscriptions?.length) {
      await this.alertSubscriptions(subscriptions);
    }
  }

  async alertSubscription(restaurant: WoltRestaurant, subscription: Subscription): Promise<void> {
    try {
      const { name, link } = restaurant;
      const { chatId, restaurant: restaurantName, restaurantPhoto } = subscription;
      const keyboard = new InlineKeyboard().url(`🍽️ ${name} 🍽️`, link);
      const replyText = ['מצאתי מסעדה שנפתחה! 🍔🍕🍣', name, 'אפשר להזמין עכשיו! 📱'].join('\n');

      try {
        await this.bot.api.sendPhoto(chatId, restaurantPhoto, { reply_markup: keyboard, caption: replyText });
      } catch (err) {
        if (isBotBlocked(err)) throw err;
        this.logger.warn(`Failed to send alert photo for chatId ${chatId}, retrying without photo: ${getErrorMessage(err)}`);
        await this.bot.api.sendMessage(chatId, replyText, { reply_markup: keyboard });
      }

      await archiveSubscription(chatId, restaurantName, true);
      await this.notifyWithUserDetails(chatId, restaurantName, ANALYTIC_EVENT_NAMES.SUBSCRIPTION_FULFILLED);
    } catch (err) {
      if (isBotBlocked(err)) {
        // the user blocked the bot - retrying every tick until the subscription expires would only spam the notifier
        this.logger.warn(`Archiving subscription for chatId ${subscription.chatId}, the user blocked the bot: ${getErrorMessage(err)}`);
        try {
          await archiveSubscription(subscription.chatId, subscription.restaurant, false);
        } catch (archiveErr) {
          this.logger.error(`Failed to archive subscription for chatId ${subscription.chatId}: ${getErrorMessage(archiveErr)}`);
        }
        return;
      }
      this.logger.error(`Failed to alert subscription for chatId ${subscription.chatId}: ${getErrorMessage(err)}`);
      notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.ALERT_SUBSCRIPTION_FAILED, error: `${err}` });
    }
  }

  async alertSubscriptions(subscriptions: Subscription[]): Promise<void> {
    const restaurants = await restaurantsService.getRestaurants();
    const restaurantsById = new Map(restaurants.map((r) => [r.id, r]));

    // one lookup per subscription, so a chain with several open branches still alerts only once
    for (const subscription of subscriptions) {
      const restaurant = subscription.restaurantId
        ? restaurantsById.get(subscription.restaurantId)
        : // subscriptions created before venue ids were stored fall back to any open branch with that name
          restaurants.find((r) => r.name === subscription.restaurant && r.isOnline);
      if (restaurant?.isOnline) {
        await this.alertSubscription(restaurant, subscription);
      }
    }
  }

  async cleanSubscription(subscription: Subscription): Promise<void> {
    try {
      const { chatId, restaurant } = subscription;
      await archiveSubscription(chatId, restaurant, false);
      const currentHour = toZonedTime(new Date(), DEFAULT_TIMEZONE).getHours();
      // between MAX_HOUR_TO_ALERT_USER and MIN_HOUR_TO_ALERT_USER the message is sent silently, so the user still learns the subscription was closed
      const isQuietHours = currentHour >= MAX_HOUR_TO_ALERT_USER && currentHour < MIN_HOUR_TO_ALERT_USER;
      const messageText = [`אני רואה שהמסעדה הזאת לא עומדת להיפתח בקרוב אז אני סוגר את ההתראה כרגע`, `אני כמובן מדבר על:`, restaurant, `אפשר להאריך את ההתראה:`].join('\n');
      const keyboard = new InlineKeyboard();
      for (const hours of SUBSCRIPTION_EXTENSION_HOURS) {
        keyboard.text(hours === 1 ? '⏳ עוד שעה' : `⏳ עוד ${hours} שעות`, [BOT_ACTIONS.EXTEND, subscription._id.toString(), hours].join(INLINE_KEYBOARD_SEPARATOR));
      }
      await this.bot.api.sendMessage(chatId, messageText, { disable_notification: isQuietHours, reply_markup: keyboard });
      this.notifyWithUserDetails(chatId, restaurant, ANALYTIC_EVENT_NAMES.SUBSCRIPTION_FAILED);
    } catch (err) {
      this.logger.error(`Failed to clean subscription for chatId ${subscription.chatId}: ${getErrorMessage(err)}`);
      notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.CLEAN_EXPIRED_SUBSCRIPTION_FAILED, error: `${err}` });
    }
  }

  async cleanExpiredSubscriptions(): Promise<void> {
    const expiredSubscriptions = await getExpiredSubscriptions(SUBSCRIPTION_EXPIRATION_HOURS);
    await Promise.all(expiredSubscriptions.map((subscription: Subscription) => this.cleanSubscription(subscription)));
  }

  async notifyWithUserDetails(chatId: number, restaurant: string, action: AnalyticEventValue) {
    const userDetails = await getUserDetails(chatId);
    notify(BOT_CONFIG, { restaurant, action }, userDetails);
  }
}

function isBotBlocked(err: unknown): boolean {
  return err instanceof GrammyError && err.error_code === 403;
}
