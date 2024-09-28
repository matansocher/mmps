import { Module } from '@nestjs/common';
import { LoggerModule } from '@core/logger';
import { MongoDatabaseFactoryModule } from '@core/mongo/shared';
import { UtilsModule } from '@core/utils';
import { WoltMongoAnalyticLogService, WoltMongoSubscriptionService, WoltMongoUserService } from './services';
import { CONNECTION_NAME, DB_NAME, MONGO_DB_URL } from './wolt-mongo.config';

@Module({
  imports: [
    LoggerModule.forChild(WoltMongoModule.name),
    UtilsModule,
    MongoDatabaseFactoryModule.forChild({
      connectionName: CONNECTION_NAME,
      uri: MONGO_DB_URL,
      dbName: DB_NAME,
    }),
  ],
  providers: [WoltMongoAnalyticLogService, WoltMongoSubscriptionService, WoltMongoUserService],
  exports: [WoltMongoAnalyticLogService, WoltMongoSubscriptionService, WoltMongoUserService],
})
export class WoltMongoModule {}
