import { Collection, Db } from 'mongodb';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { getErrorMessage } from '@core/utils';
import { SubscriptionModel } from '../models/subscription.model';
import { COLLECTIONS, CONNECTION_NAME } from '../wolt-mongo.config';

@Injectable()
export class WoltMongoSubscriptionService {
  private readonly logger = new Logger(WoltMongoSubscriptionService.name);
  private readonly subscriptionCollection: Collection<SubscriptionModel>;

  constructor(@Inject(CONNECTION_NAME) private readonly db: Db) {
    this.subscriptionCollection = this.db.collection(COLLECTIONS.SUBSCRIPTION);
  }

  async getActiveSubscriptions(chatId: number = null) {
  // async getActiveSubscriptions(chatId: number = null): Promise<SubscriptionModel[]> {
    try {
      const filter = { isActive: true };
      if (chatId) filter['chatId'] = chatId;
      return this.subscriptionCollection.find(filter).toArray();
    } catch (err) {
      this.logger.error(this.getActiveSubscriptions.name, `err: ${getErrorMessage(err)}`);
      return [];
    }
  }

  async getSubscription(chatId: number, restaurant: string) {
    const filter = { chatId, restaurant, isActive: true };
    return this.subscriptionCollection.findOne(filter);
  }

  async addSubscription(chatId: number, restaurant: string, restaurantPhoto: string) {
    const subscription = {
      chatId,
      restaurant,
      restaurantPhoto,
      isActive: true,
      createdAt: new Date(),
    } as SubscriptionModel;
    return this.subscriptionCollection.insertOne(subscription);
  }

  archiveSubscription(chatId: number, restaurant: string) {
    const filter = { chatId, restaurant, isActive: true };
    const updateObj = { $set: { isActive: false } };
    return this.subscriptionCollection.updateOne(filter, updateObj);
  }

  async getExpiredSubscriptions(subscriptionExpirationHours: number) {
    const validLimitTimestamp = new Date(Date.now() - subscriptionExpirationHours * 60 * 60 * 1000); // Ensure it is a Date object
    const filter = { isActive: true, createdAt: { $lt: validLimitTimestamp } };
    return this.subscriptionCollection.find(filter as any).toArray();
  }
}
