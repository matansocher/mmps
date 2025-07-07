import { Collection, Db } from 'mongodb';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { COLLECTIONS, CONNECTION_NAME } from '../caller-mongo.config';
import { Subscription } from '../models';

@Injectable()
export class CallerMongoSubscriptionService {
  private readonly logger = new Logger(CallerMongoSubscriptionService.name);
  private readonly subscriptionCollection: Collection<Subscription>;

  constructor(@Inject(CONNECTION_NAME) private readonly db: Db) {
    this.subscriptionCollection = this.db.collection(COLLECTIONS.SUBSCRIPTION);
  }

  async getActiveSubscriptions(chatId: number = null) {
    try {
      const filter = { isActive: true };
      if (chatId) filter['chatId'] = chatId;
      return this.subscriptionCollection.find(filter).toArray();
    } catch (err) {
      this.logger.error(`${this.getActiveSubscriptions.name} - err: ${err}`);
      return [];
    }
  }

  async getSubscription(chatId: number, time: string) {
    const filter = { chatId, time, isActive: true };
    return this.subscriptionCollection.findOne(filter);
  }

  async addSubscription(chatId: number, time: string) {
    const subscription = {
      chatId,
      time,
      isActive: true,
      createdAt: new Date(),
    } as Subscription;
    return this.subscriptionCollection.insertOne(subscription);
  }

  archiveSubscription(chatId: number, time: string) {
    const filter = { chatId, time, isActive: true };
    const updateObj = { $set: { isActive: false, finishedAt: new Date() } } as Partial<Subscription>;
    return this.subscriptionCollection.updateOne(filter, updateObj);
  }

  async getExpiredSubscriptions(subscriptionExpirationHours: number) {
    const validLimitTimestamp = new Date(Date.now() - subscriptionExpirationHours * 60 * 60 * 1000); // Ensure it is a Date object
    const filter = { isActive: true, createdAt: { $lt: validLimitTimestamp } };
    return this.subscriptionCollection.find(filter).toArray();
  }
}
