import { SchedulerRegistry } from '@nestjs/schedule';
import TelegramBot from 'node-telegram-bot-api';
import { Inject, Injectable } from '@nestjs/common';
import { LoggerService } from '@core/logger/logger.service';
import { NotifierBotService } from '@core/notifier-bot/notifier-bot.service';
import { SubscriptionModel } from '@core/mongo/wolt-mongo/models';
import { UtilsService } from '@core/utils/utils.service';
import { WoltMongoAnalyticLogService, WoltMongoSubscriptionService, WoltMongoUserService } from '@core/mongo/wolt-mongo/services';
import { BOTS } from '@services/telegram/telegram.config';
import { IWoltRestaurant } from '@services/wolt/interface';
import { TelegramGeneralService } from '@services/telegram/telegram-general.service';
import * as woltConfig from '@services/wolt/wolt.config';
import { WoltService } from '@services/wolt/wolt.service';
import { WoltUtilsService } from '@services/wolt/wolt-utils.service';

const JOB_NAME = 'wolt-scheduler-job-interval';

@Injectable()
export class WoltSchedulerService {
  constructor(
    private readonly logger: LoggerService,
    private readonly utilsService: UtilsService,
    private readonly woltService: WoltService,
    private readonly woltUtilsService: WoltUtilsService,
    private readonly mongoAnalyticLogService: WoltMongoAnalyticLogService,
    private readonly mongoUserService: WoltMongoUserService,
    private readonly mongoSubscriptionService: WoltMongoSubscriptionService,
    private readonly telegramGeneralService: TelegramGeneralService,
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly notifierBotService: NotifierBotService,
    @Inject(BOTS.WOLT.name) private readonly bot: TelegramBot,
  ) {}

  async scheduleNextInterval(): Promise<void> {
    const secondsToNextRefresh = this.getSecondsToNextRefresh();

    // Clear existing timeout if it exists
    try {
      this.schedulerRegistry.deleteTimeout(JOB_NAME);
    } catch (error) {}

    await this.handleIntervalFlow();

    const timeout = setTimeout(() => {
      this.scheduleNextInterval();
    }, secondsToNextRefresh * 1000);

    this.schedulerRegistry.addTimeout(JOB_NAME, timeout);
  }

  async handleIntervalFlow() {
    await this.cleanExpiredSubscriptions();
    const subscriptions = (await this.mongoSubscriptionService.getActiveSubscriptions()) as SubscriptionModel[];
    if (subscriptions && subscriptions.length) {
      await this.woltService.refreshRestaurants();
      await this.alertSubscriptions(subscriptions);
    }
  }

  getSecondsToNextRefresh(): number {
    const currentHour = new Date().getHours() + woltConfig.HOURS_DIFFERENCE_FROM_UTC; // $$$$$$$$$$$$$$$$$$$$$$$$$$$$
    const israelHour = currentHour % 24;
    return woltConfig.HOUR_OF_DAY_TO_REFRESH_MAP[israelHour];
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
          const inlineKeyboardMarkup = this.telegramGeneralService.getInlineKeyboardMarkup(inlineKeyboardButtons);
          const replyText = `${restaurant.name} is now open!, go ahead and order!`;
          // promisesArr.push(this.telegramGeneralService.sendMessage(this.bot, subscription.chatId, replyText, inlineKeyboardMarkup), this.woltUtilsService.getKeyboardOptions());
          promisesArr.push(this.telegramGeneralService.sendPhoto(this.bot, subscription.chatId, subscription.restaurantPhoto, { ...inlineKeyboardMarkup, caption: replyText }));
          promisesArr.push(this.mongoSubscriptionService.archiveSubscription(subscription.chatId, subscription.restaurant));
          promisesArr.push(this.notifierBotService.notify(BOTS.WOLT.name, { data: { restaurant: subscription.restaurant }, action: woltConfig.ANALYTIC_EVENT_NAMES.SUBSCRIPTION_FULFILLED }, subscription.chatId, this.mongoUserService));
        });
      });
      return Promise.all(promisesArr);
    } catch (err) {
      this.logger.error(this.alertSubscriptions.name, `error - ${this.utilsService.getErrorMessage(err)}`);
    }
  }

  async cleanExpiredSubscriptions(): Promise<void> {
    try {
      const expiredSubscriptions = await this.mongoSubscriptionService.getExpiredSubscriptions(woltConfig.SUBSCRIPTION_EXPIRATION_HOURS);
      const promisesArr = [];
      expiredSubscriptions.forEach((subscription: SubscriptionModel) => {
        promisesArr.push(this.mongoSubscriptionService.archiveSubscription(subscription.chatId, subscription.restaurant));
        const currentHour = new Date().getHours();
        if (currentHour >= woltConfig.MIN_HOUR_TO_ALERT_USER && currentHour <= woltConfig.MAX_HOUR_TO_ALERT_USER) { // let user know that subscription was removed only between 8am to 11pm
          promisesArr.push(this.telegramGeneralService.sendMessage(this.bot, subscription.chatId, `Subscription for ${subscription.restaurant} was removed since it didn't open for the last ${woltConfig.SUBSCRIPTION_EXPIRATION_HOURS} hours`), this.woltUtilsService.getKeyboardOptions());
        }
        this.notifierBotService.notify(BOTS.WOLT.name, { data: { restaurant: subscription.restaurant }, action: woltConfig.ANALYTIC_EVENT_NAMES.SUBSCRIPTION_FULFILLED }, subscription.chatId, this.mongoUserService);
      });
      await Promise.all(promisesArr);
    } catch (err) {
      this.logger.error(this.cleanExpiredSubscriptions.name, `error - ${this.utilsService.getErrorMessage(err)}`);
    }
  }
}
