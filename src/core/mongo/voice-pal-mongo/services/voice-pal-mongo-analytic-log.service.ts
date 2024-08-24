import { Db } from 'mongodb';
import { Inject, Injectable } from '@nestjs/common';
import { MongoAnalyticLogService } from '@core/mongo/shared/services';
import { CONNECTION_NAME } from '../voice-pal-mongo.config';

@Injectable()
export class VoicePalMongoAnalyticLogService extends MongoAnalyticLogService {
  constructor(@Inject(CONNECTION_NAME) private readonly db: Db) {
    super(db);
  }
}
