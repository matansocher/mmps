import { Db } from 'mongodb';
import { Inject, Injectable } from '@nestjs/common';
import { MongoUserService } from '@core/mongo/shared';
import { CONNECTION_NAME } from '../coach-mongo.config';

@Injectable()
export class CoachMongoUserService extends MongoUserService {
  constructor(@Inject(CONNECTION_NAME) private readonly db: Db) {
    super(db);
  }
}
