import { Module } from '@nestjs/common';
import { LoggerModule } from '@core/logger';
import { MongoDatabaseFactoryModule } from '@core/mongo/shared';
import { UtilsModule } from '@core/utils';
import { NewsMongoAnalyticLogService, NewsMongoSubscriptionService, NewsMongoThreadService, NewsMongoUserService } from './services';
import { CONNECTION_NAME, DB_NAME, MONGO_DB_URL } from './news-mongo.config';

@Module({
  imports: [
    LoggerModule.forChild(NewsMongoModule.name),
    UtilsModule,
    MongoDatabaseFactoryModule.forChild({
      connectionName: CONNECTION_NAME,
      uri: MONGO_DB_URL,
      dbName: DB_NAME,
    }),
  ],
  providers: [NewsMongoAnalyticLogService, NewsMongoSubscriptionService, NewsMongoThreadService, NewsMongoUserService],
  exports: [NewsMongoAnalyticLogService, NewsMongoSubscriptionService, NewsMongoThreadService, NewsMongoUserService],
})
export class NewsMongoModule {}
