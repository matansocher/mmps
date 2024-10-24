import { Db } from 'mongodb';
import { Inject, Injectable } from '@nestjs/common';
import { COLLECTIONS, CONNECTION_NAME } from '../news-mongo.config';

@Injectable()
export class NewsMongoSubscriptionService {
  subscriptionCollection: any;

  constructor(@Inject(CONNECTION_NAME) private readonly db: Db) {
    this.subscriptionCollection = this.db.collection(COLLECTIONS.SUBSCRIPTION);
  }

  getActiveSubscriptions() {
    return this.subscriptionCollection.find({ isActive: true }).toArray();
  }

  async subscribeChat(chatId: number) {
    const record = await this.subscriptionCollection.findOne({ chatId });
    if (record) {
      return this.subscriptionCollection.updateOne({ chatId }, { $set: { isActive: true, createdAt: new Date() } });
    } else {
      return this.subscriptionCollection.insertOne({ chatId, isActive: true, createdAt: new Date() });
    }
  }

  async unsubscribeChat(chatId: number) {
    const record = await this.subscriptionCollection.findOne({ chatId });
    if (!record) {
      return;
    }
    return this.subscriptionCollection.updateOne({ chatId }, { $set: { isActive: false } });
  }
}
