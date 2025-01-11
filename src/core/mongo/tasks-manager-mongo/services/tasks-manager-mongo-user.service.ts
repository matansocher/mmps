import { Db } from 'mongodb';
import { Inject, Injectable } from '@nestjs/common';
import { LoggerService } from '@core/logger';
import { MongoUserService } from '@core/mongo/shared';
import { CONNECTION_NAME } from '../tasks-manager-mongo.config';

@Injectable()
export class TasksManagerMongoUserService extends MongoUserService {
  constructor(
    private readonly loggerService: LoggerService,
    @Inject(CONNECTION_NAME) private readonly db: Db,
  ) {
    super(db, loggerService);
  }
}
