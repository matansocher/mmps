import { toZonedTime } from 'date-fns-tz';
import { type Bot, InlineKeyboard } from 'grammy';
import { DEFAULT_TIMEZONE } from '@core/config';
import { Logger } from '@core/utils';
import { notify } from '@services/notifier';
import { archiveSubscription, getActiveSubscriptions, getExpiredSubscriptions, getUserDetails, Subscription, WoltRestaurant } from '@shared/wolt';
import { restaurantsService } from './restaurants.service';
import { ANALYTIC_EVENT_NAMES, BOT_CONFIG, HOUR_OF_DAY_TO_REFRESH_MAP, MAX_HOUR_TO_ALERT_USER, MIN_HOUR_TO_ALERT_USER, SUBSCRIPTION_EXPIRATION_HOURS } from './wolt.config';

export type AnalyticEventValue = (typeof ANALYTIC_EVENT_NAMES)[keyof typeof ANALYTIC_EVENT_NAMES];

const JOB_NAME = 'wolt-scheduler-job-interval';

export class WoltSchedulerService {
  private readonly logger = new Logger(WoltSchedulerService.name);
  private timeouts: Map<string, ReturnType<typeof setTimeout>> = new Map();

  constructor(private readonly bot: Bot) {}

  async scheduleInterval(): Promise<void> {
    const secondsToNextRefresh = HOUR_OF_DAY_TO_REFRESH_MAP[toZonedTime(new Date(), DEFAULT_TIMEZONE).getHours()];

    // Clear existing timeout if it exists
    const existingTimeout = this.timeouts.get(JOB_NAME);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    await this.handleIntervalFlow();

    const timeout = setTimeout(() => {
      this.scheduleInterval();
    }, secondsToNextRefresh * 1000);

    this.timeouts.set(JOB_NAME, timeout);
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
        this.logger.error(`${this.alertSubscription.name} - error - ${err}`);
        notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.ALERT_SUBSCRIPTION_FAILED, error: `${err}`, whatNow: 'retrying to alert the user without photo' });
        await this.bot.api.sendMessage(chatId, replyText, { reply_markup: keyboard });
      }

      await archiveSubscription(chatId, restaurantName, true);
      await this.notifyWithUserDetails(chatId, restaurantName, ANALYTIC_EVENT_NAMES.SUBSCRIPTION_FULFILLED);
    } catch (err) {
      this.logger.error(`${this.alertSubscription.name} - error - ${err}`);
      notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.ALERT_SUBSCRIPTION_FAILED, error: `${err}` });
    }
  }

  async alertSubscriptions(subscriptions: Subscription[]): Promise<void> {
    const restaurantsNames = subscriptions.map((subscription: Subscription) => subscription.restaurant);
    const restaurants = await this.getRestaurantsForSubscriptions(subscriptions);
    const onlineRestaurants = restaurants.filter(({ name, isOnline }) => restaurantsNames.includes(name) && isOnline);

    for (const restaurant of onlineRestaurants) {
      const relevantSubscriptions = subscriptions.filter((subscription) => subscription.restaurant === restaurant.name);
      for (const subscription of relevantSubscriptions) {
        await this.alertSubscription(restaurant, subscription);
      }
    }
  }

  // Only fetch the areas that actually have active subscriptions (usually 1-2 cities instead of all of them),
  // which keeps us well under Wolt's rate limit. Fall back to the full list if any subscription is missing its area
  // (legacy subscriptions created before the area was stored).
  private async getRestaurantsForSubscriptions(subscriptions: Subscription[]): Promise<WoltRestaurant[]> {
    const allHaveArea = subscriptions.every((subscription) => !!subscription.area);
    if (!allHaveArea) {
      return restaurantsService.getRestaurants();
    }
    const areas = [...new Set(subscriptions.map((subscription) => subscription.area))] as string[];
    return restaurantsService.getRestaurantsByAreas(areas);
  }

  async cleanSubscription(subscription: Subscription): Promise<void> {
    try {
      const { chatId, restaurant } = subscription;
      await archiveSubscription(chatId, restaurant, false);
      const currentHour = toZonedTime(new Date(), DEFAULT_TIMEZONE).getHours();
      if (currentHour >= MIN_HOUR_TO_ALERT_USER || currentHour < MAX_HOUR_TO_ALERT_USER) {
        // let user know that subscription was removed only between MIN_HOUR_TO_ALERT_USER and MAX_HOUR_TO_ALERT_USER
        const messageText = [`אני רואה שהמסעדה הזאת לא עומדת להיפתח בקרוב אז אני סוגר את ההתראה כרגע`, `אני כמובן מדבר על:`, restaurant, `תמיד אפשר ליצור התראה חדשה`].join('\n');
        await this.bot.api.sendMessage(chatId, messageText);
      }
      this.notifyWithUserDetails(chatId, restaurant, ANALYTIC_EVENT_NAMES.SUBSCRIPTION_FAILED);
    } catch (err) {
      this.logger.error(`${this.cleanSubscription.name} - error - ${err}`);
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
