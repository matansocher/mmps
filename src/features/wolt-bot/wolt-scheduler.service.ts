import TelegramBot from 'node-telegram-bot-api';
import { SchedulerRegistry } from '@nestjs/schedule';
import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { LoggerService } from '@core/logger';
import { NotifierBotService } from '@core/notifier-bot';
import { WoltMongoSubscriptionService, WoltMongoUserService, SubscriptionModel } from '@core/mongo/wolt-mongo';
import { BOTS, getInlineKeyboardMarkup } from '@services/telegram';
import {
  IWoltRestaurant,
  ANALYTIC_EVENT_NAMES,
  HOUR_OF_DAY_TO_REFRESH_MAP,
  MAX_HOUR_TO_ALERT_USER,
  MIN_HOUR_TO_ALERT_USER,
  SUBSCRIPTION_EXPIRATION_HOURS,
  WoltService,
} from '@services/wolt';
import { getKeyboardOptions } from '@services/wolt';
import { getErrorMessage, getTimezoneOffset } from '@core/utils';

const JOB_NAME = 'wolt-scheduler-job-interval';

@Injectable()
export class WoltSchedulerService implements OnModuleInit {
  constructor(
    private readonly logger: LoggerService,
    private readonly woltService: WoltService,
    private readonly mongoUserService: WoltMongoUserService,
    private readonly mongoSubscriptionService: WoltMongoSubscriptionService,
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly notifierBotService: NotifierBotService,
    @Inject(BOTS.WOLT.name) private readonly bot: TelegramBot,
  ) {}

  onModuleInit(): void {
    this.scheduleInterval();
  }

  async scheduleInterval(): Promise<void> {
    const secondsToNextRefresh = this.getSecondsToNextRefresh();

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
    if (subscriptions && subscriptions.length) {
      await this.woltService.refreshRestaurants();
      await this.alertSubscriptions(subscriptions);
    }
  }

  getSecondsToNextRefresh(): number {
    const currentHour = new Date().getHours() + getTimezoneOffset();
    const israelHour = currentHour % 24;
    return HOUR_OF_DAY_TO_REFRESH_MAP[israelHour];
  }

  alertSubscriptions(subscriptions: SubscriptionModel[]): Promise<any> {
    try {
      const restaurantsWithSubscriptionNames = subscriptions.map((subscription: SubscriptionModel) => subscription.restaurant);
      const subscribedAndOnlineRestaurants = this.woltService
        .getRestaurants()
        .filter((restaurant: IWoltRestaurant) => restaurantsWithSubscriptionNames.includes(restaurant.name) && restaurant.isOnline);
      const promisesArr = [];
      subscribedAndOnlineRestaurants.forEach((restaurant: IWoltRestaurant) => {
        const relevantSubscriptions = subscriptions.filter((subscription: SubscriptionModel) => subscription.restaurant === restaurant.name);
        relevantSubscriptions.forEach((subscription: SubscriptionModel) => {
          const restaurantLinkUrl = this.woltService.getRestaurantLink(restaurant);
          const inlineKeyboardButtons = [
            { text: restaurant.name, url: restaurantLinkUrl },
          ];
          const inlineKeyboardMarkup = getInlineKeyboardMarkup(inlineKeyboardButtons);
          const replyText = `${restaurant.name} is now open!, go ahead and order!`;
          // promisesArr.push(this.bot.sendMessage(subscription.chatId, replyText, inlineKeyboardMarkup), getKeyboardOptions());
          // promisesArr.push(this.telegramGeneralService.sendPhoto(this.bot, subscription.chatId, subscription.restaurantPhoto, { ...inlineKeyboardMarkup, caption: replyText }));
          promisesArr.push(this.bot.sendPhoto(subscription.chatId, subscription.restaurantPhoto, { ...inlineKeyboardMarkup, caption: replyText } as any));
          promisesArr.push(this.mongoSubscriptionService.archiveSubscription(subscription.chatId, subscription.restaurant));
          promisesArr.push(this.notifierBotService.notify(BOTS.WOLT.name, { restaurant: subscription.restaurant, action: ANALYTIC_EVENT_NAMES.SUBSCRIPTION_FULFILLED }, subscription.chatId, this.mongoUserService));
        });
      });
      return Promise.all(promisesArr);
    } catch (err) {
      this.logger.error(this.alertSubscriptions.name, `error - ${getErrorMessage(err)}`);
    }
  }

  async cleanExpiredSubscriptions(): Promise<void> {
    try {
      const expiredSubscriptions = await this.mongoSubscriptionService.getExpiredSubscriptions(SUBSCRIPTION_EXPIRATION_HOURS);
      const promisesArr = [];
      expiredSubscriptions.forEach((subscription: SubscriptionModel) => {
        promisesArr.push(this.mongoSubscriptionService.archiveSubscription(subscription.chatId, subscription.restaurant));
        const currentHour = new Date().getHours();
        if (currentHour >= MIN_HOUR_TO_ALERT_USER && currentHour <= MAX_HOUR_TO_ALERT_USER) { // let user know that subscription was removed only between 8am to 11pm
          promisesArr.push(this.bot.sendMessage(subscription.chatId, `Subscription for ${subscription.restaurant} was removed since it didn't open for the last ${SUBSCRIPTION_EXPIRATION_HOURS} hours`), getKeyboardOptions());
        }
        this.notifierBotService.notify(BOTS.WOLT.name, { restaurant: subscription.restaurant, action: ANALYTIC_EVENT_NAMES.SUBSCRIPTION_FAILED }, subscription.chatId, this.mongoUserService);
      });
      await Promise.all(promisesArr);
    } catch (err) {
      this.logger.error(this.cleanExpiredSubscriptions.name, `error - ${getErrorMessage(err)}`);
    }
  }
}
