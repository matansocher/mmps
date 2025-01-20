import { Db } from 'mongodb';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { COLLECTIONS, CONNECTION_NAME } from '../rollinspark-mongo.config';
import { SubscriptionModel } from '@core/mongo/rollinspark-mongo';
import { getErrorMessage } from '@core/utils';

@Injectable()
export class RollinsparkMongoSubscriptionService {
  private readonly logger = new Logger(RollinsparkMongoSubscriptionService.name);
  subscriptionCollection: any;

  constructor(@Inject(CONNECTION_NAME) private readonly db: Db) {
    this.subscriptionCollection = this.db.collection(COLLECTIONS.SUBSCRIPTION);
  }

  async getActiveSubscriptions(chatId: number = null): Promise<SubscriptionModel[]> {
    try {
      const filter = { isActive: true };
      if (chatId) {
        filter['chatId'] = chatId;
      }
      return this.subscriptionCollection.find(filter).toArray();
    } catch (err) {
      this.logger.error(`${this.getActiveSubscriptions.name} - err: ${getErrorMessage(err)}`);
      return [];
    }
  }

  async getSubscription(chatId: number, planId: number): Promise<SubscriptionModel> {
    const filter = { chatId, planId, isActive: true };
    return this.subscriptionCollection.findOne(filter);
  }

  async getSubscriptions(chatId: number): Promise<SubscriptionModel[]> {
    const filter = { chatId, isActive: true };
    return this.subscriptionCollection.find(filter).toArray();
  }

  async addSubscription(chatId: number, planId: number) {
    const subscription = {
      chatId,
      planId,
      isActive: true,
      createdAt: new Date(),
    };
    return this.subscriptionCollection.insertOne(subscription);
  }

  archiveSubscription(chatId: number, planId: number) {
    const filter = { chatId, planId, isActive: true };
    const updateObj = { $set: { isActive: false } };
    return this.subscriptionCollection.updateOne(filter, updateObj);
  }
}
