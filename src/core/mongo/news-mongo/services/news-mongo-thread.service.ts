import { Db } from 'mongodb';
import { Inject, Injectable } from '@nestjs/common';
import { ThreadModel } from '@core/mongo/news-mongo';
import { COLLECTIONS, CONNECTION_NAME } from '../news-mongo.config';

@Injectable()
export class NewsMongoThreadService {
  threadCollection: any;

  constructor(@Inject(CONNECTION_NAME) private readonly db: Db) {
    this.threadCollection = this.db.collection(COLLECTIONS.THREAD);
  }

  getCurrentThread(): ThreadModel {
    return this.threadCollection.findOne({ isActive: true });
  }

  stopThread(threadId) {
    return this.threadCollection.updateOne({ threadId }, { $set: { isActive: false } });
  }

  async saveThread(threadId: string) {
    const thread = {
      threadId,
      isActive: true,
      createdAt: new Date(),
    };
    const { insertedId } = await this.threadCollection.insertOne(thread);
    return { ...thread, _id: insertedId };
  }
}
