import { Collection, Db } from 'mongodb';
import { Inject, Injectable } from '@nestjs/common';
import { COLLECTIONS, CONNECTION_NAME } from '../coach-mongo.config';
import { SubscriptionModel } from '../models/subscription.model';

@Injectable()
export class CoachMongoSubscriptionService {
  private readonly subscriptionCollection: Collection<SubscriptionModel>;

  constructor(@Inject(CONNECTION_NAME) private readonly db: Db) {
    this.subscriptionCollection = this.db.collection(COLLECTIONS.SUBSCRIPTION);
  }

  async getActiveSubscriptions() {
    const filter = { isActive: true };
    return this.subscriptionCollection.find(filter).toArray();
  }

  async getSubscription(chatId: number) {
    const filter = { chatId, isActive: true };
    return this.subscriptionCollection.findOne(filter);
  }

  async addSubscription(chatId: number) {
    const subscription = {
      chatId,
      isActive: true,
      createdAt: new Date(),
    } as SubscriptionModel;
    return this.subscriptionCollection.insertOne(subscription);
  }

  archiveSubscription(chatId: number) {
    const filter = { chatId, isActive: true };
    const updateObj = { $set: { isActive: false } };
    return this.subscriptionCollection.updateOne(filter, updateObj);
  }
}
