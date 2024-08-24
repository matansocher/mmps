import { MongoUserService } from '@core/mongo/shared/services';
import { Db } from 'mongodb';
import { Inject, Injectable } from '@nestjs/common';
import { LoggerService } from '@core/logger/logger.service';
import { UtilsService } from '@core/utils/utils.service';
import { CONNECTION_NAME } from '../wolt-mongo.config';

@Injectable()
export class WoltMongoUserService extends MongoUserService {
  constructor(
    @Inject(CONNECTION_NAME) private readonly db: Db,
    private readonly loggerService: LoggerService,
    private readonly utilsService: UtilsService,
  ) {
    super(db, loggerService, utilsService);
  }
}
