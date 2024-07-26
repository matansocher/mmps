import { BOTS } from '@core/config/telegram.config';
import { LoggerService } from '@core/logger/logger.service';
import { WoltMongoService } from '@core/mongo/wolt-mongo/wolt-mongo.service';
import { Injectable } from '@nestjs/common';
import { TelegramBotsFactoryService } from '@services/telegram/telegram-bots-factory.service';
import { TelegramGeneralService } from '@services/telegram/telegram-general.service';
import { UtilsService } from '@services/utils/utils.service';
import { ANALYTIC_EVENT_NAMES } from '@services/wolt/wolt.config';
import { WoltService } from '@services/wolt/wolt.service';
import * as woltConfig from '@services/wolt/wolt.config';
import * as woltUtils from '@services/wolt/wolt.utils';

@Injectable()
export class WoltSchedulerService {
  private bot: any;

  constructor(
    private readonly logger: LoggerService,
    private readonly utilsService: UtilsService,
    private readonly woltService: WoltService,
    private readonly mongoService: WoltMongoService,
    private readonly telegramBotsFactoryService: TelegramBotsFactoryService,
    private readonly telegramGeneralService: TelegramGeneralService,
  ) {
    this.startInterval();
  }

  async startInterval(): Promise<void> {
    this.bot = await this.telegramBotsFactoryService.getBot(BOTS.WOLT.name);

    await this.cleanExpiredSubscriptions();
    const subscriptions = await this.mongoService.getActiveSubscriptions();
    if (subscriptions && subscriptions.length) {
      await this.woltService.refreshRestaurants();
      await this.alertSubscribers(subscriptions);
    }

    const secondsToNextRefresh = this.getSecondsToNextRefresh();
    setTimeout(async () => {
      await this.startInterval();
    }, secondsToNextRefresh * 1000);
  }

  getSecondsToNextRefresh(): number {
    const currentHour = new Date().getHours() + woltConfig.HOURS_DIFFERENCE_FROM_UTC;
    const israelHour = currentHour % 24;
    return woltConfig.HOUR_OF_DAY_TO_REFRESH_MAP[israelHour];
  }

  alertSubscribers(subscriptions): Promise<any> {
    try {
      const restaurantsWithSubscriptionNames = subscriptions.map((subscription) => subscription.restaurant);
      const subscribedAndOnlineRestaurants = this.woltService
        .getRestaurants()
        .filter((restaurant) => restaurantsWithSubscriptionNames.includes(restaurant.name) && restaurant.isOnline);
      const promisesArr = [];
      subscribedAndOnlineRestaurants.forEach((restaurant) => {
        const relevantSubscriptions = subscriptions.filter((subscription) => subscription.restaurant === restaurant.name);
        relevantSubscriptions.forEach((subscription) => {
          const restaurantLinkUrl = this.woltService.getRestaurantLink(restaurant);
          const inlineKeyboardButtons = [
            { text: restaurant.name, url: restaurantLinkUrl },
          ];
          const inlineKeyboardMarkup = this.telegramGeneralService.getInlineKeyboardMarkup(inlineKeyboardButtons);
          const replyText = `${restaurant.name} is now open!, go ahead and order!`;
          // promisesArr.push(this.telegramGeneralService.sendMessage(this.bot, subscription.chatId, replyText, inlineKeyboardMarkup), woltUtils.getKeyboardOptions());
          promisesArr.push(this.telegramGeneralService.sendPhoto(this.bot, subscription.chatId, subscription.restaurantPhoto, { ...inlineKeyboardMarkup, caption: replyText }));
          promisesArr.push(this.mongoService.archiveSubscription(subscription.chatId, subscription.restaurant));
          promisesArr.push(this.mongoService.sendAnalyticLog(ANALYTIC_EVENT_NAMES.SUBSCRIPTION_FULFILLED, { chatId: subscription.chatId, data: restaurant.name }));
        });
      });
      return Promise.all(promisesArr);
    } catch (err) {
      this.logger.error(this.alertSubscribers.name, `error - ${this.utilsService.getErrorMessage(err)}`);
    }
  }

  async cleanExpiredSubscriptions(): Promise<void> {
    try {
      const expiredSubscriptions = await this.mongoService.getExpiredSubscriptions(woltConfig.SUBSCRIPTION_EXPIRATION_HOURS);
      const promisesArr = [];
      expiredSubscriptions.forEach((subscription) => {
        promisesArr.push(this.mongoService.archiveSubscription(subscription.chatId, subscription.restaurant));
        const currentHour = new Date().getHours();
        if (currentHour >= woltConfig.MIN_HOUR_TO_ALERT_USER && currentHour <= woltConfig.MAX_HOUR_TO_ALERT_USER) { // let user know that subscription was removed only between 8am to 11pm
          promisesArr.push(this.telegramGeneralService.sendMessage(this.bot, subscription.chatId, `Subscription for ${subscription.restaurant} was removed since it didn't open for the last ${woltConfig.SUBSCRIPTION_EXPIRATION_HOURS} hours`), woltUtils.getKeyboardOptions());
        }
        promisesArr.push(this.mongoService.sendAnalyticLog(ANALYTIC_EVENT_NAMES.SUBSCRIPTION_FAILED, { chatId: subscription.chatId, data: subscription.restaurant }));
      });
      await Promise.all(promisesArr);
    } catch (err) {
      this.logger.error(this.cleanExpiredSubscriptions.name, `error - ${this.utilsService.getErrorMessage(err)}`);
    }
  }
}
