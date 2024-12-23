import { Db } from 'mongodb';
import { Inject, Injectable } from '@nestjs/common';
import { LoggerService } from '@core/logger';
import { MongoUserService } from '@core/mongo/shared';
import { UtilsService } from '@core/utils';
import { CONNECTION_NAME } from '../voice-pal-mongo.config';

@Injectable()
export class VoicePalMongoUserService extends MongoUserService {
  constructor(
    private readonly loggerService: LoggerService,
    private readonly utilsService: UtilsService,
    @Inject(CONNECTION_NAME) private readonly db: Db,
  ) {
    super(db, loggerService, utilsService);
  }
}
