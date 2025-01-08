import { Db } from 'mongodb';
import { Inject, Injectable } from '@nestjs/common';
import { LoggerService } from '@core/logger';
import { UtilsService } from '@core/utils';
import { COLLECTIONS, CONNECTION_NAME } from '../rollinspark-mongo.config';
import { SubscriptionModel } from '@core/mongo/rollinspark-mongo';

@Injectable()
export class RollinsparkMongoSubscriptionService {
  subscriptionCollection: any;

  constructor(
    private readonly logger: LoggerService,
    private readonly utilsService: UtilsService,
    @Inject(CONNECTION_NAME) private readonly db: Db,
  ) {
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
      this.logger.error(this.getActiveSubscriptions.name, `err: ${this.utilsService.getErrorMessage(err)}`);
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
