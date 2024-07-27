// import { AnalyticLogModel, UserModel } from '@core/mongo/shared/models';
import { COLLECTIONS, CONNECTION_NAME } from '@core/mongo/voice-pal-mongo/voice-pal-mongo.config';
import { Db } from 'mongodb';
import { Inject, Injectable } from '@nestjs/common';

@Injectable()
export class VoicePalMongoAnalyticLogService {
  constructor(@Inject(CONNECTION_NAME) private readonly db: Db) {}

  sendAnalyticLog(eventName: string, { chatId, data = null, error = null, message = null }): Promise<any> {
    const analyticLogCollection = this.db.collection(COLLECTIONS.ANALYTIC_LOGS);
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
