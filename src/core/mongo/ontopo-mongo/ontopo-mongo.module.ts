import { LoggerModule } from '@core/logger/logger.module';
import { MongoDatabaseFactoryModule } from '@core/mongo/shared/mongo-database-factory.module';
import { OntopoMongoAnalyticLogService, OntopoMongoSubscriptionService, OntopoMongoUserService } from './services';
import { Module } from '@nestjs/common';
import { UtilsModule } from '@core/utils/utils.module';
import { CONNECTION_NAME, DB_NAME, MONGO_DB_URL } from './ontopo-mongo.config';

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
