import TelegramBot from 'node-telegram-bot-api';
import { Inject, Injectable } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { LoggerService } from '@core/logger/logger.service';
// import { NotifierBotService } from '@core/notifier-bot/notifier-bot.service';
import { SubscriptionModel } from '@core/mongo/tabit-mongo/models';
import { TabitMongoAnalyticLogService, TabitMongoSubscriptionService, TabitMongoUserService } from '@core/mongo/tabit-mongo/services';
import { UtilsService } from '@core/utils/utils.service';
import { BOTS } from '@services/telegram/telegram.config';
import { TabitApiService } from '@services/tabit/tabit-api/tabit-api.service';
import { TabitUtilsService } from '@services/tabit/tabit-flow/tabit-utils.service';
import * as tabitConfig from '@services/tabit/tabit.config';
import { TelegramGeneralService } from '@services/telegram/telegram-general.service';

const JOB_NAME = 'tabit-scheduler-job-interval';

@Injectable()
export class TabitSchedulerService {
  constructor(
    private readonly logger: LoggerService,
    private readonly utilsService: UtilsService,
    private readonly tabitApiService: TabitApiService,
    private readonly mongoAnalyticLogService: TabitMongoAnalyticLogService,
    private readonly mongoUserService: TabitMongoUserService,
    private readonly mongoSubscriptionService: TabitMongoSubscriptionService,
    private readonly tabitUtilsService: TabitUtilsService,
    private readonly telegramGeneralService: TelegramGeneralService,
    private readonly schedulerRegistry: SchedulerRegistry,
    // private readonly notifierBotService: NotifierBotService,
    @Inject(BOTS.TABIT.name) private readonly bot: TelegramBot,
  ) {}

  async scheduleInterval(): Promise<void> {
    // Clear existing timeout if it exists
    try {
      this.schedulerRegistry.deleteTimeout(JOB_NAME);
    } catch (error) {}

    await this.handleIntervalFlow();

    const secondsToNextRefresh = this.getSecondsToNextRefresh();
    const timeout = setTimeout(() => {
      this.scheduleInterval();
    }, secondsToNextRefresh * 1000);

    this.schedulerRegistry.addTimeout(JOB_NAME, timeout);
  }

  async handleIntervalFlow(): Promise<void> {
    await this.cleanExpiredSubscriptions();
    const subscriptions = await this.mongoSubscriptionService.getActiveSubscriptions();
    if (subscriptions && subscriptions.length) {
      await this.alertSubscriptions(subscriptions);
    }
  }

  getSecondsToNextRefresh(): number {
    const currentHour = new Date().getHours() + tabitConfig.HOURS_DIFFERENCE_FROM_UTC; // $$$$$$$$$$$$$$$$$$$$$$$$$$$$
    const israelHour = currentHour % 24;
    return tabitConfig.HOUR_OF_DAY_TO_REFRESH_MAP[israelHour];
  }

  async alertSubscriptions(subscriptions: SubscriptionModel[]) {
    return Promise.all(subscriptions.map((subscription: SubscriptionModel) => this.alertSubscription(subscription)));
  }

  async alertSubscription(subscription: SubscriptionModel): Promise<void> {
    try {
      const { chatId, userSelections, restaurantDetails } = subscription;
      const { id: restaurantId, title: restaurantTitle } = restaurantDetails;
      const { isAvailable } = await this.tabitApiService.getRestaurantAvailability(restaurantDetails, subscription.userSelections);
      if (!isAvailable) {
        await this.mongoSubscriptionService.archiveSubscription(chatId, subscription._id);
        await this.telegramGeneralService.sendMessage(this.bot, chatId, `Subscription for ${restaurantTitle} at ${userSelections.date} - ${userSelections.time} was removed 😢.\nthe restaurant was not available and the due date has passed`);
        // this.notifierBotService.notify(BOTS.TABIT.name, { data: { restaurant: restaurantTitle }, action: tabitConfig.ANALYTIC_EVENT_NAMES.SUBSCRIPTION_FULFILLED }, chatId, this.mongoUserService);
      }

      const restaurantLinkUrl = this.tabitUtilsService.getRestaurantLinkForUser(restaurantId);
      const inlineKeyboardButtons = [{ text: 'Order Now!', url: restaurantLinkUrl }];
      const inlineKeyboardMarkup = this.telegramGeneralService.getInlineKeyboardMarkup(inlineKeyboardButtons);
      const replyText = `${restaurantTitle} is now available at ${userSelections.date} - ${userSelections.time}!\nI have occupied that time so wait a few minutes and then you should be able to order!`;
      await Promise.all([
        this.telegramGeneralService.sendPhoto(this.bot, chatId, restaurantDetails.image, { ...inlineKeyboardMarkup, caption: replyText }),
        // this.mongoSubscriptionService.archiveSubscription(chatId, subscription._id), // $$$$$$$$$$$$$$$in case user wants to re-subscribe to the same subscription, add a button in addition besides the order now button saying somthing like -re-subscribe to same details$$$$$$$$$$$$$$$
        // this.notifierBotService.notify(BOTS.TABIT.name, { data: { restaurant: restaurantTitle }, action: tabitConfig.ANALYTIC_EVENT_NAMES.SUBSCRIPTION_FULFILLED }, chatId, this.mongoUserService),
      ]);
    } catch (err) {
      this.logger.error(this.alertSubscription.name, `error - ${this.utilsService.getErrorMessage(err)}`);
    }
  }

  async cleanExpiredSubscriptions(): Promise<void> {
    try {
      const expiredSubscriptions = await this.mongoSubscriptionService.getExpiredSubscriptions();
      const promisesArr = [];
      expiredSubscriptions.forEach((subscription: SubscriptionModel) => {
        const { _id, chatId, restaurantDetails, userSelections } = subscription;
        const { date, time } = userSelections;
        const { title: restaurantTitle } = restaurantDetails;
        promisesArr.push(this.mongoSubscriptionService.archiveSubscription(chatId, _id));
        promisesArr.push(this.telegramGeneralService.sendMessage(this.bot, chatId, `Subscription for ${restaurantTitle} at ${date} - ${time} was removed 😢.\nthe restaurant was not available and the due date has passed`));
        // this.notifierBotService.notify(BOTS.TABIT.name, { data: { restaurant: subscription.restaurant }, action: tabitConfig.ANALYTIC_EVENT_NAMES.SUBSCRIPTION_FULFILLED }, subscription.chatId, this.mongoUserService);
      });
      await Promise.all(promisesArr);
    } catch (err) {
      this.logger.error(this.cleanExpiredSubscriptions.name, `error - ${this.utilsService.getErrorMessage(err)}`);
    }
  }
}
