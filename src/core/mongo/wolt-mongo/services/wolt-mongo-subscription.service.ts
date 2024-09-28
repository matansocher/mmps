import { MY_USER_ID } from '@core/notifier-bot/notifier-bot.config';
import { Db } from 'mongodb';
import { Inject, Injectable } from '@nestjs/common';
import { isProd } from '@core/config/main.config';
import { LoggerService } from '@core/logger';
import { UtilsService } from '@core/utils';
import { COLLECTIONS, CONNECTION_NAME } from '../wolt-mongo.config';

@Injectable()
export class WoltMongoSubscriptionService {
  constructor(
    @Inject(CONNECTION_NAME) private readonly db: Db,
    private readonly logger: LoggerService,
    private readonly utilsService: UtilsService,
  ) {}

  async getActiveSubscriptions(chatId: number = null) {
  // async getActiveSubscriptions(chatId: number = null): Promise<SubscriptionModel[]> {
    try {
      const subscriptionCollection = this.db.collection(COLLECTIONS.SUBSCRIPTION);
      const filter = { isActive: true };
      if (chatId) filter['chatId'] = chatId;
      if (!isProd) filter['chatId'] = MY_USER_ID;
      return subscriptionCollection.find(filter).toArray();
    } catch (err) {
      this.logger.error(this.getActiveSubscriptions.name, `err: ${this.utilsService.getErrorMessage(err)}`);
      return [];
    }
  }

  async getSubscription(chatId: number, restaurant: string) {
    const subscriptionCollection = this.db.collection(COLLECTIONS.SUBSCRIPTION);
    const filter = { chatId, restaurant, isActive: true };
    return subscriptionCollection.findOne(filter);
  }

  async addSubscription(chatId: number, restaurant: string, restaurantPhoto: string) {
    const subscriptionCollection = this.db.collection(COLLECTIONS.SUBSCRIPTION);
    const subscription = {
      chatId,
      restaurant,
      restaurantPhoto,
      isActive: true,
      createdAt: new Date(),
    };
    return subscriptionCollection.insertOne(subscription);
  }

  archiveSubscription(chatId: number, restaurant: string) {
    const subscriptionCollection = this.db.collection(COLLECTIONS.SUBSCRIPTION);
    const filter = { chatId, restaurant, isActive: true };
    const updateObj = { $set: { isActive: false } };
    return subscriptionCollection.updateOne(filter, updateObj);
  }

  async getExpiredSubscriptions(subscriptionExpirationHours: number) {
    const subscriptionCollection = this.db.collection(COLLECTIONS.SUBSCRIPTION);
    const validLimitTimestamp = new Date().getTime() - subscriptionExpirationHours * 60 * 60 * 1000;
    const filter = { isActive: true, createdAt: { $lt: validLimitTimestamp } };
    if (!isProd) filter['chatId'] = MY_USER_ID;
    return subscriptionCollection.find(filter).toArray();
  }
}
