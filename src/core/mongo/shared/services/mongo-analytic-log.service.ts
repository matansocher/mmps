import { Db } from 'mongodb';
import { Injectable } from '@nestjs/common';
import { COLLECTIONS } from '../mongo.config';

@Injectable()
export class MongoAnalyticLogService {
  constructor(private readonly database: Db) {}

  sendAnalyticLog(eventName: string, { chatId, data = null, error = null, message = null }): Promise<any> {
    const analyticLogCollection = this.database.collection(COLLECTIONS.ANALYTIC_LOGS);
    const log = {
      chatId,
      data,
      eventName,
      message,
      error,
      createdAt: new Date(),
    };
    return analyticLogCollection.insertOne(log);
  }
}
