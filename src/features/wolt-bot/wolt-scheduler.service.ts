import { toZonedTime } from 'date-fns-tz';
import type TelegramBot from 'node-telegram-bot-api';
import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { DEFAULT_TIMEZONE } from '@core/config';
import { SubscriptionModel, WoltMongoSubscriptionService, WoltMongoUserService } from '@core/mongo/wolt-mongo';
import { NotifierBotService } from '@core/notifier-bot';
import { getErrorMessage } from '@core/utils';
import { BOTS, getInlineKeyboardMarkup, UserDetails } from '@services/telegram';
import { AnalyticEventValue, WoltRestaurant } from './interface';
import { RestaurantsService } from './restaurants.service';
import { ANALYTIC_EVENT_NAMES, HOUR_OF_DAY_TO_REFRESH_MAP, MAX_HOUR_TO_ALERT_USER, MIN_HOUR_TO_ALERT_USER, SUBSCRIPTION_EXPIRATION_HOURS } from './wolt-bot.config';

const JOB_NAME = 'wolt-scheduler-job-interval';

@Injectable()
export class WoltSchedulerService implements OnModuleInit {
  private readonly logger = new Logger(WoltSchedulerService.name);

  constructor(
    private readonly restaurantsService: RestaurantsService,
    private readonly mongoUserService: WoltMongoUserService,
    private readonly mongoSubscriptionService: WoltMongoSubscriptionService,
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly notifierBotService: NotifierBotService,
    @Inject(BOTS.WOLT.id) private readonly bot: TelegramBot,
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
    const subscriptions = (await this.mongoSubscriptionService.getActiveSubscriptions()) as SubscriptionModel[];
    if (subscriptions?.length) {
      await this.alertSubscriptions(subscriptions);
    }
  }

  async alertSubscription(restaurant: WoltRestaurant, subscription: SubscriptionModel): Promise<void> {
    try {
      const inlineKeyboardMarkup = getInlineKeyboardMarkup([{ text: `🍽️ ${restaurant.name} 🍽️`, url: restaurant.link }]);
      const replyText = ['מצאתי מסעדה שנפתחה! 🍔🍕🍣', restaurant.name, 'אפשר להזמין עכשיו! 📱'].join('\n');
      await this.bot.sendPhoto(subscription.chatId, subscription.restaurantPhoto, { ...inlineKeyboardMarkup, caption: replyText } as any);
      await this.mongoSubscriptionService.archiveSubscription(subscription.chatId, subscription.restaurant);
      await this.notifyWithUserDetails(subscription.chatId, subscription.restaurant, ANALYTIC_EVENT_NAMES.SUBSCRIPTION_FULFILLED);
    } catch (err) {
      const errMessage = getErrorMessage(err);
      this.logger.error(`${this.alertSubscription.name} - error - ${errMessage}`);
      this.notifierBotService.notify(BOTS.WOLT, { action: ANALYTIC_EVENT_NAMES.ALERT_SUBSCRIPTION_FAILED, error: errMessage });
    }
  }

  async alertSubscriptions(subscriptions: SubscriptionModel[]): Promise<void> {
    const restaurantsNames = subscriptions.map((subscription: SubscriptionModel) => subscription.restaurant);
    const restaurants = await this.restaurantsService.getRestaurants();
    const onlineRestaurants = restaurants.filter(({ name, isOnline }) => restaurantsNames.includes(name) && isOnline); // $$$$$$$$$$$$$$$$$$$$$$

    for (const restaurant of onlineRestaurants) {
      const relevantSubscriptions = subscriptions.filter((subscription) => subscription.restaurant === restaurant.name);
      for (const subscription of relevantSubscriptions) {
        await this.alertSubscription(restaurant, subscription);
      }
    }
  }

  async cleanSubscription(subscription: SubscriptionModel): Promise<void> {
    try {
      await this.mongoSubscriptionService.archiveSubscription(subscription.chatId, subscription.restaurant);
      const currentHour = toZonedTime(new Date(), DEFAULT_TIMEZONE).getHours();
      if (currentHour >= MIN_HOUR_TO_ALERT_USER || currentHour < MAX_HOUR_TO_ALERT_USER) {
        // let user know that subscription was removed only between MIN_HOUR_TO_ALERT_USER and MAX_HOUR_TO_ALERT_USER
        const messageText = [`אני רואה שהמסעדה הזאת לא עומדת להיפתח בקרוב אז אני סוגר את ההתראה כרגע`, `אני כמובן מדבר על:`, subscription.restaurant, `תמיד אפשר ליצור התראה חדשה`].join('\n');
        await this.bot.sendMessage(subscription.chatId, messageText);
      }
      this.notifyWithUserDetails(subscription.chatId, subscription.restaurant, ANALYTIC_EVENT_NAMES.SUBSCRIPTION_FAILED);
    } catch (err) {
      const errMessage = getErrorMessage(err);
      this.logger.error(`${this.cleanSubscription.name} - error - ${errMessage}`);
      this.notifierBotService.notify(BOTS.WOLT, { action: ANALYTIC_EVENT_NAMES.CLEAN_EXPIRED_SUBSCRIPTION_FAILED, error: errMessage });
    }
  }

  async cleanExpiredSubscriptions(): Promise<void> {
    const expiredSubscriptions = await this.mongoSubscriptionService.getExpiredSubscriptions(SUBSCRIPTION_EXPIRATION_HOURS);
    await Promise.all(expiredSubscriptions.map((subscription: SubscriptionModel) => this.cleanSubscription(subscription)));
  }

  async notifyWithUserDetails(chatId: number, restaurant: string, action: AnalyticEventValue) {
    const userDetails = (await this.mongoUserService.getUserDetails({ chatId })) as unknown as UserDetails;
    this.notifierBotService.notify(BOTS.WOLT, { restaurant, action }, userDetails);
  }
}
