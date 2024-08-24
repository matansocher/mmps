import { Db } from 'mongodb';
import { Inject, Injectable } from '@nestjs/common';
import { MongoAnalyticLogService } from '@core/mongo/shared/services';
import { CONNECTION_NAME } from '../stock-buddy-mongo.config';

@Injectable()
export class StockBuddyMongoAnalyticLogService extends MongoAnalyticLogService {
  constructor(@Inject(CONNECTION_NAME) private readonly db: Db) {
    super(db);
  }
}
