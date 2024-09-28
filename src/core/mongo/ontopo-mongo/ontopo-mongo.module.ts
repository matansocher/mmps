import { Module } from '@nestjs/common';
import { LoggerModule } from '@core/logger';
import { MongoDatabaseFactoryModule } from '@core/mongo/shared/mongo-database-factory.module';
import { UtilsModule } from '@core/utils';
import { CONNECTION_NAME, DB_NAME, MONGO_DB_URL } from './ontopo-mongo.config';
import { OntopoMongoAnalyticLogService, OntopoMongoSubscriptionService, OntopoMongoUserService } from './services';

@Module({
  imports: [
    LoggerModule.forChild(OntopoMongoModule.name),
    UtilsModule,
    MongoDatabaseFactoryModule.forChild({
      connectionName: CONNECTION_NAME,
      uri: MONGO_DB_URL,
      dbName: DB_NAME,
    }),
  ],
  providers: [OntopoMongoAnalyticLogService, OntopoMongoSubscriptionService, OntopoMongoUserService],
  exports: [OntopoMongoAnalyticLogService, OntopoMongoSubscriptionService, OntopoMongoUserService],
})
export class OntopoMongoModule {}
