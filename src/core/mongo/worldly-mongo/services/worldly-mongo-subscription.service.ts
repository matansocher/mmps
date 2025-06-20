import { Collection, Db, InsertOneResult } from 'mongodb';
import { Inject, Injectable } from '@nestjs/common';
import { Subscription } from '../models';
import { COLLECTIONS, CONNECTION_NAME } from '../worldly-mongo.config';

@Injectable()
export class WorldlyMongoSubscriptionService {
  private readonly subscriptionCollection: Collection<Subscription>;

  constructor(@Inject(CONNECTION_NAME) private readonly db: Db) {
    this.subscriptionCollection = this.db.collection(COLLECTIONS.SUBSCRIPTION);
  }

  getActiveSubscriptions(): Promise<Subscription[]> {
    const filter = { isActive: true };
    return this.subscriptionCollection.find(filter).toArray();
  }

  getSubscription(chatId: number): Promise<Subscription> {
    const filter = { chatId };
    return this.subscriptionCollection.findOne(filter);
  }

  addSubscription(chatId: number): Promise<InsertOneResult<Subscription>> {
    const subscription = {
      chatId,
      isActive: true,
      createdAt: new Date(),
    } as Subscription;
    return this.subscriptionCollection.insertOne(subscription);
  }

  async updateSubscription(chatId: number, toUpdate: Partial<Subscription>): Promise<void> {
    const filter = { chatId };
    const updateObj = { $set: { ...toUpdate } };
    await this.subscriptionCollection.updateOne(filter, updateObj);
  }
}
