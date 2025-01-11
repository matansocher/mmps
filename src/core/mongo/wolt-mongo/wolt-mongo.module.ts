import { Module } from '@nestjs/common';
import { LoggerModule } from '@core/logger';
import { MongoDatabaseFactoryModule } from '@core/mongo/shared';
import { WoltMongoSubscriptionService, WoltMongoUserService } from './services';
import { CONNECTION_NAME, DB_NAME, MONGO_DB_URL } from './wolt-mongo.config';

@Module({
  imports: [
    LoggerModule.forChild(WoltMongoModule.name),
    MongoDatabaseFactoryModule.forChild({
      connectionName: CONNECTION_NAME,
      uri: MONGO_DB_URL,
      dbName: DB_NAME,
    }),
  ],
  providers: [WoltMongoSubscriptionService, WoltMongoUserService],
  exports: [WoltMongoSubscriptionService, WoltMongoUserService],
})
export class WoltMongoModule {}
