import { LoggerModule } from '@core/logger';
import { MongoDatabaseFactoryModule } from '@core/mongo/shared';
import { TabitMongoAnalyticLogService, TabitMongoSubscriptionService, TabitMongoUserService } from './services';
import { Module } from '@nestjs/common';
import { UtilsModule } from '@core/utils';
import { CONNECTION_NAME, DB_NAME, MONGO_DB_URL } from './tabit-mongo.config';

@Module({
  imports: [
    LoggerModule.forChild(TabitMongoModule.name),
    UtilsModule,
    MongoDatabaseFactoryModule.forChild({
      connectionName: CONNECTION_NAME,
      uri: MONGO_DB_URL,
      dbName: DB_NAME,
    }),
  ],
  providers: [TabitMongoAnalyticLogService, TabitMongoSubscriptionService, TabitMongoUserService],
  exports: [TabitMongoAnalyticLogService, TabitMongoSubscriptionService, TabitMongoUserService],
})
export class TabitMongoModule {}
