import { toZonedTime } from 'date-fns-tz';
import type TelegramBot from 'node-telegram-bot-api';
import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { DEFAULT_TIMEZONE } from '@core/config';
import { SubscriptionModel, WoltMongoSubscriptionService, WoltMongoUserService } from '@core/mongo/wolt-mongo';
import { NotifierBotService } from '@core/notifier-bot';
import { getErrorMessage } from '@core/utils';
import { BOTS, getInlineKeyboardMarkup } from '@services/telegram';
import { WoltRestaurant } from './interface';
import { RestaurantsService } from './restaurants.service';
import {
  ANALYTIC_EVENT_NAMES,
  HOUR_OF_DAY_TO_REFRESH_MAP,
  MAX_HOUR_TO_ALERT_USER,
  MIN_HOUR_TO_ALERT_USER,
  SUBSCRIPTION_EXPIRATION_HOURS,
} from './wolt-bot.config';

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
    if (!subscriptions?.length) {
      return;
    }
    await this.alertSubscriptions(subscriptions);
  }

  async alertSubscriptions(subscriptions: SubscriptionModel[]): Promise<any> {
    try {
      const restaurantsWithSubscriptionNames = subscriptions.map((subscription: SubscriptionModel) => subscription.restaurant);
      const restaurants = await this.restaurantsService.getRestaurants();
      const subscribedAndOnlineRestaurants = restaurants.filter(
        (restaurant: WoltRestaurant) => restaurantsWithSubscriptionNames.includes(restaurant.name) && restaurant.isOnline,
      );
      const promisesArr = [];
      subscribedAndOnlineRestaurants.forEach((restaurant: WoltRestaurant) => {
        const relevantSubscriptions = subscriptions.filter((subscription: SubscriptionModel) => subscription.restaurant === restaurant.name);
        relevantSubscriptions.forEach((subscription: SubscriptionModel) => {
          const inlineKeyboardButtons = [{ text: restaurant.name, url: restaurant.link }];
          const inlineKeyboardMarkup = getInlineKeyboardMarkup(inlineKeyboardButtons);
          const replyText = ['מצאתי מסעדה שנפתחה! 🍔🍕🍣', restaurant.name, 'אפשר להזמין עכשיו! 📱'].join('\n');
          promisesArr.push(
            this.bot.sendPhoto(subscription.chatId, subscription.restaurantPhoto, {
              ...inlineKeyboardMarkup,
              caption: replyText,
            } as any),
          );
          promisesArr.push(this.mongoSubscriptionService.archiveSubscription(subscription.chatId, subscription.restaurant));
          promisesArr.push(
            this.notifierBotService.notify(
              BOTS.WOLT,
              { restaurant: subscription.restaurant, action: ANALYTIC_EVENT_NAMES.SUBSCRIPTION_FULFILLED },
              subscription.chatId,
              this.mongoUserService,
            ),
          );
        });
      });
      await Promise.all(promisesArr);
    } catch (err) {
      this.logger.error(`${this.alertSubscriptions.name} - error - ${getErrorMessage(err)}`);
    }
  }

  async cleanExpiredSubscriptions(): Promise<void> {
    try {
      const expiredSubscriptions = await this.mongoSubscriptionService.getExpiredSubscriptions(SUBSCRIPTION_EXPIRATION_HOURS);
      const promisesArr = [];
      expiredSubscriptions.forEach((subscription: SubscriptionModel) => {
        promisesArr.push(this.mongoSubscriptionService.archiveSubscription(subscription.chatId, subscription.restaurant));
        const currentHour = toZonedTime(new Date(), DEFAULT_TIMEZONE).getHours();
        if (currentHour >= MIN_HOUR_TO_ALERT_USER || currentHour < MAX_HOUR_TO_ALERT_USER) {
          // let user know that subscription was removed only between MIN_HOUR_TO_ALERT_USER and MAX_HOUR_TO_ALERT_USER
          promisesArr.push(
            this.bot.sendMessage(
              subscription.chatId,
              [
                `אני רואה שהמסעדה הזאת לא עומדת להיפתח בקרוב אז אני סוגר את ההתראה כרגע`,
                `אני כמובן מדבר על:`,
                subscription.restaurant,
                `תמיד אפשר ליצור התראה חדשה`,
              ].join('\n'),
            ),
          );
        }
        this.notifierBotService.notify(
          BOTS.WOLT,
          { restaurant: subscription.restaurant, action: ANALYTIC_EVENT_NAMES.SUBSCRIPTION_FAILED },
          subscription.chatId,
          this.mongoUserService,
        );
      });
      await Promise.all(promisesArr);
    } catch (err) {
      this.logger.error(`${this.cleanExpiredSubscriptions.name} - error - ${getErrorMessage(err)}`);
    }
  }
}
