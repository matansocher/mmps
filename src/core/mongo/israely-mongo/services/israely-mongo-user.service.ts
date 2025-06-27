import { Db } from 'mongodb';
import { Inject, Injectable } from '@nestjs/common';
import { MongoUserService } from '@core/mongo/shared';
import { CONNECTION_NAME } from '../israely-mongo.config';

@Injectable()
export class IsraelyMongoUserService extends MongoUserService {
  constructor(@Inject(CONNECTION_NAME) private readonly db: Db) {
    super(db);
  }
}
