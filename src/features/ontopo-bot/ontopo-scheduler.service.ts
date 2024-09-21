import TelegramBot from 'node-telegram-bot-api';
import { Inject, Injectable } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { LoggerService } from '@core/logger/logger.service';
import { NotifierBotService } from '@core/notifier-bot/notifier-bot.service';
import { SubscriptionModel } from '@core/mongo/ontopo-mongo/models';
import { OntopoMongoAnalyticLogService, OntopoMongoSubscriptionService, OntopoMongoUserService } from '@core/mongo/ontopo-mongo/services';
import { UtilsService } from '@core/utils/utils.service';
import { BOTS } from '@services/telegram/telegram.config';
import { OntopoApiService } from '@services/ontopo/ontopo-api/ontopo-api.service';
import { OntopoUtilsService } from '@services/ontopo/ontopo-flow/ontopo-utils.service';
import { ANALYTIC_EVENT_NAMES, HOUR_OF_DAY_TO_REFRESH_MAP } from '@services/ontopo/ontopo.config';
import { TelegramGeneralService } from '@services/telegram/telegram-general.service';

const JOB_NAME = 'ontopo-scheduler-job-interval';

@Injectable()
export class OntopoSchedulerService {
  constructor(
    private readonly logger: LoggerService,
    private readonly utilsService: UtilsService,
    private readonly ontopoApiService: OntopoApiService,
    private readonly mongoAnalyticLogService: OntopoMongoAnalyticLogService,
    private readonly mongoUserService: OntopoMongoUserService,
    private readonly mongoSubscriptionService: OntopoMongoSubscriptionService,
    private readonly ontopoUtilsService: OntopoUtilsService,
    private readonly telegramGeneralService: TelegramGeneralService,
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly notifierBotService: NotifierBotService,
    @Inject(BOTS.ONTOPO.name) private readonly bot: TelegramBot,
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
    const currentHour = new Date().getHours() + this.utilsService.getTimezoneOffset();
    const israelHour = currentHour % 24;
    return HOUR_OF_DAY_TO_REFRESH_MAP[israelHour];
  }

  async alertSubscriptions(subscriptions: SubscriptionModel[]) {
    return Promise.all(subscriptions.map((subscription: SubscriptionModel) => this.alertSubscription(subscription)));
  }

  async alertSubscription(subscription: SubscriptionModel): Promise<void> {
    try {
      const { chatId, userSelections, restaurantDetails } = subscription;
      const { slug, title: restaurantTitle } = restaurantDetails;
      const { isAvailable } = await this.ontopoApiService.getRestaurantAvailability(restaurantDetails.slug, subscription.userSelections);
      if (!isAvailable) {
        return;
      }

      const restaurantLinkUrl = this.ontopoUtilsService.getRestaurantLinkForUser(slug);
      const inlineKeyboardButtons = [{ text: 'Order Now!', url: restaurantLinkUrl }];
      const inlineKeyboardMarkup = this.telegramGeneralService.getInlineKeyboardMarkup(inlineKeyboardButtons);
      const replyText = `${restaurantTitle} is now available at ${userSelections.date} - ${userSelections.time}!\nI have occupied that time so wait a few minutes and then you should be able to order!`;
      await Promise.all([
        this.telegramGeneralService.sendPhoto(this.bot, chatId, restaurantDetails.image, { ...inlineKeyboardMarkup, caption: replyText }),
        this.mongoSubscriptionService.archiveSubscription(chatId, subscription._id),
        this.notifierBotService.notify(BOTS.ONTOPO.name, { restaurant: restaurantTitle, action: ANALYTIC_EVENT_NAMES.SUBSCRIPTION_FULFILLED }, chatId, this.mongoUserService),
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
        promisesArr.push(this.telegramGeneralService.sendMessage(this.bot, chatId, `Subscription for ${restaurantTitle} at ${this.ontopoUtilsService.getDateStringFormat(date)} - ${time} was removed since the due date has passed 😢.\nWanna try with another restaurant?`));
        promisesArr.push(this.notifierBotService.notify(BOTS.ONTOPO.name, { restaurant: restaurantTitle, action: ANALYTIC_EVENT_NAMES.SUBSCRIPTION_FAILED }, subscription.chatId, this.mongoUserService));
      });
      await Promise.all(promisesArr);
    } catch (err) {
      this.logger.error(this.cleanExpiredSubscriptions.name, `error - ${this.utilsService.getErrorMessage(err)}`);
    }
  }
}
