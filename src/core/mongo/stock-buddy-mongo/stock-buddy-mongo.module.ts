import { Module } from '@nestjs/common';
import { LoggerModule } from '@core/logger/logger.module';
import { MongoDatabaseFactoryModule } from '@core/mongo/shared/mongo-database-factory.module';
import { StockBuddyMongoAnalyticLogService, StockBuddyMongoSubscriptionService, StockBuddyMongoUserService } from './services';
import { UtilsModule } from '@core/utils/utils.module';
import { CONNECTION_NAME, DB_NAME, MONGO_DB_URL } from './stock-buddy-mongo.config';

@Module({
  imports: [
    LoggerModule.forChild(StockBuddyMongoModule.name),
    UtilsModule,
    MongoDatabaseFactoryModule.forChild({
      connectionName: CONNECTION_NAME,
      uri: MONGO_DB_URL,
      dbName: DB_NAME,
    }),
  ],
  providers: [StockBuddyMongoAnalyticLogService, StockBuddyMongoSubscriptionService, StockBuddyMongoUserService],
  exports: [StockBuddyMongoAnalyticLogService, StockBuddyMongoSubscriptionService, StockBuddyMongoUserService],
})
export class StockBuddyMongoModule {}
