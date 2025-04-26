import { Collection, Db, InsertOneResult } from 'mongodb';
import { Inject, Injectable } from '@nestjs/common';
import { SubscriptionModel } from '../models';
import { COLLECTIONS, CONNECTION_NAME } from '../worldly-mongo.config';

@Injectable()
export class WorldlyMongoSubscriptionService {
  private readonly subscriptionCollection: Collection<SubscriptionModel>;

  constructor(@Inject(CONNECTION_NAME) private readonly db: Db) {
    this.subscriptionCollection = this.db.collection(COLLECTIONS.SUBSCRIPTION);
  }

  getActiveSubscriptions(): Promise<SubscriptionModel[]> {
    const filter = { isActive: true };
    return this.subscriptionCollection.find(filter).toArray();
  }

  getSubscription(chatId: number): Promise<SubscriptionModel> {
    const filter = { chatId };
    return this.subscriptionCollection.findOne(filter);
  }

  addSubscription(chatId: number): Promise<InsertOneResult<SubscriptionModel>> {
    const subscription = {
      chatId,
      isActive: true,
      createdAt: new Date(),
    } as SubscriptionModel;
    return this.subscriptionCollection.insertOne(subscription);
  }

  async updateSubscription(chatId: number, toUpdate: Partial<SubscriptionModel>): Promise<void> {
    const filter = { chatId };
    const updateObj = { $set: { ...toUpdate } };
    await this.subscriptionCollection.updateOne(filter, updateObj);
  }
}
