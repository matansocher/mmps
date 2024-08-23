import { Db } from 'mongodb';
import { Inject, Injectable } from '@nestjs/common';
import { LoggerService } from '@core/logger/logger.service';
import { SubscriptionModel } from '../models';
import { COLLECTIONS, CONNECTION_NAME } from '../stock-buddy-mongo.config';
import { UtilsService } from '@core/utils/utils.service';

@Injectable()
export class StockBuddyMongoSubscriptionService {
  constructor(
    @Inject(CONNECTION_NAME) private readonly db: Db,
    private readonly logger: LoggerService,
    private readonly utilsService: UtilsService,
  ) {}

  async getActiveSubscriptions(chatId: number = null): Promise<SubscriptionModel[]> {
    try {
      const subscriptionCollection = this.db.collection(COLLECTIONS.SUBSCRIPTION);
      const filter = { isActive: true };
      if (chatId) filter['chatId'] = chatId;
      const cursor = subscriptionCollection.find(filter);
      return this.getMultipleResults(cursor);
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
    const cursor = subscriptionCollection.find(filter);
    return this.getMultipleResults(cursor);
  }

  async getMultipleResults(cursor: any) {
    const results = [];
    for await (const doc of cursor) {
      results.push(doc);
    }
    return results;
  }
}
