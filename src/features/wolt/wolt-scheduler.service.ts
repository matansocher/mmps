import { toZonedTime } from 'date-fns-tz';
import type TelegramBot from 'node-telegram-bot-api';
import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { DEFAULT_TIMEZONE } from '@core/config';
import { NotifierService } from '@core/notifier';
import { getInlineKeyboardMarkup, UserDetails } from '@services/telegram';
import { archiveSubscription, getActiveSubscriptions, getExpiredSubscriptions, getUserDetails } from './mongo';
import { RestaurantsService } from './restaurants.service';
import { Subscription, WoltRestaurant } from './types';
import { ANALYTIC_EVENT_NAMES, BOT_CONFIG, HOUR_OF_DAY_TO_REFRESH_MAP, MAX_HOUR_TO_ALERT_USER, MIN_HOUR_TO_ALERT_USER, SUBSCRIPTION_EXPIRATION_HOURS } from './wolt.config';

export type AnalyticEventValue = (typeof ANALYTIC_EVENT_NAMES)[keyof typeof ANALYTIC_EVENT_NAMES];

const JOB_NAME = 'wolt-scheduler-job-interval';

@Injectable()
export class WoltSchedulerService implements OnModuleInit {
  private readonly logger = new Logger(WoltSchedulerService.name);

  constructor(
    private readonly restaurantsService: RestaurantsService,
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly notifier: NotifierService,
    @Inject(BOT_CONFIG.id) private readonly bot: TelegramBot,
  ) {}

  onModuleInit(): void {
    this.scheduleInterval();
  }

  async scheduleInterval(): Promise<void> {
    const secondsToNextRefresh = HOUR_OF_DAY_TO_REFRESH_MAP[toZonedTime(new Date(), DEFAULT_TIMEZONE).getHours()];

    // Clear existing timeout if it exists
    try {
      this.schedulerRegistry.deleteTimeout(JOB_NAME);
    } catch {}

    await this.handleIntervalFlow();

    const timeout = setTimeout(() => {
      this.scheduleInterval();
    }, secondsToNextRefresh * 1000);

    this.schedulerRegistry.addTimeout(JOB_NAME, timeout);
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
      const inlineKeyboardMarkup = getInlineKeyboardMarkup([{ text: `🍽️ ${name} 🍽️`, url: link }]);
      const replyText = ['מצאתי מסעדה שנפתחה! 🍔🍕🍣', name, 'אפשר להזמין עכשיו! 📱'].join('\n');

      try {
        await this.bot.sendPhoto(chatId, restaurantPhoto, { ...inlineKeyboardMarkup, caption: replyText });
      } catch (err) {
        this.logger.error(`${this.alertSubscription.name} - error - ${err}`);
        this.notifier.notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.ALERT_SUBSCRIPTION_FAILED, error: `${err}`, whatNow: 'retrying to alert the user without photo' });
        await this.bot.sendMessage(chatId, replyText, inlineKeyboardMarkup);
      }

      await archiveSubscription(chatId, restaurantName, true);
      await this.notifyWithUserDetails(chatId, restaurantName, ANALYTIC_EVENT_NAMES.SUBSCRIPTION_FULFILLED);
    } catch (err) {
      this.logger.error(`${this.alertSubscription.name} - error - ${err}`);
      this.notifier.notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.ALERT_SUBSCRIPTION_FAILED, error: `${err}` });
    }
  }

  async alertSubscriptions(subscriptions: Subscription[]): Promise<void> {
    const restaurantsNames = subscriptions.map((subscription: Subscription) => subscription.restaurant);
    const restaurants = await this.restaurantsService.getRestaurants();
    const onlineRestaurants = restaurants.filter(({ name, isOnline }) => restaurantsNames.includes(name) && isOnline);

    for (const restaurant of onlineRestaurants) {
      const relevantSubscriptions = subscriptions.filter((subscription) => subscription.restaurant === restaurant.name);
      for (const subscription of relevantSubscriptions) {
        await this.alertSubscription(restaurant, subscription);
      }
    }
  }

  async cleanSubscription(subscription: Subscription): Promise<void> {
    try {
      const { chatId, restaurant } = subscription;
      await archiveSubscription(chatId, restaurant, false);
      const currentHour = toZonedTime(new Date(), DEFAULT_TIMEZONE).getHours();
      if (currentHour >= MIN_HOUR_TO_ALERT_USER || currentHour < MAX_HOUR_TO_ALERT_USER) {
        // let user know that subscription was removed only between MIN_HOUR_TO_ALERT_USER and MAX_HOUR_TO_ALERT_USER
        const messageText = [`אני רואה שהמסעדה הזאת לא עומדת להיפתח בקרוב אז אני סוגר את ההתראה כרגע`, `אני כמובן מדבר על:`, restaurant, `תמיד אפשר ליצור התראה חדשה`].join('\n');
        await this.bot.sendMessage(chatId, messageText);
      }
      this.notifyWithUserDetails(chatId, restaurant, ANALYTIC_EVENT_NAMES.SUBSCRIPTION_FAILED);
    } catch (err) {
      this.logger.error(`${this.cleanSubscription.name} - error - ${err}`);
      this.notifier.notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.CLEAN_EXPIRED_SUBSCRIPTION_FAILED, error: `${err}` });
    }
  }

  async cleanExpiredSubscriptions(): Promise<void> {
    const expiredSubscriptions = await getExpiredSubscriptions(SUBSCRIPTION_EXPIRATION_HOURS);
    await Promise.all(expiredSubscriptions.map((subscription: Subscription) => this.cleanSubscription(subscription)));
  }

  async notifyWithUserDetails(chatId: number, restaurant: string, action: AnalyticEventValue) {
    const userDetails = await getUserDetails(chatId);
    this.notifier.notify(BOT_CONFIG, { restaurant, action }, userDetails);
  }
}
