import { isProd } from '@core/config/main.config';
import { MY_USER_ID } from '@core/notifier-bot/notifier-bot.config';
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
    const filter = { isActive: true };
    if (!isProd) filter['chatId'] = MY_USER_ID;
    return this.subscriptionCollection.find(filter).toArray();
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
