import { MongoAnalyticLogService } from '@core/mongo/shared';
import { Inject, Injectable } from '@nestjs/common';
import { Db } from 'mongodb';
import { CONNECTION_NAME } from '../news-mongo.config';

@Injectable()
export class NewsMongoAnalyticLogService extends MongoAnalyticLogService {
  constructor(@Inject(CONNECTION_NAME) private readonly db: Db) {
    super(db);
  }
}
