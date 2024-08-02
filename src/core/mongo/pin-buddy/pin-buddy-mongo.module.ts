import { LoggerModule } from '@core/logger/logger.module';
import { MongoDatabaseFactoryModule } from '@core/mongo/shared/mongo-database-factory.module';
import { PinBuddyMongoAnalyticLogService, PinBuddyMongoUserService, PinBuddyMongoPinService } from '@core/mongo/pin-buddy/services';
import { Module } from '@nestjs/common';
import { UtilsModule } from '@services/utils/utils.module';
import { CONNECTION_NAME, DB_NAME, MONGO_DB_URL } from './pin-buddy-mongo.config';

@Module({
  imports: [
    LoggerModule.forRoot(PinBuddyMongoModule.name),
    UtilsModule,
    MongoDatabaseFactoryModule.forRoot({
      connectionName: CONNECTION_NAME,
      uri: MONGO_DB_URL,
      dbName: DB_NAME,
    }),
  ],
  providers: [PinBuddyMongoAnalyticLogService, PinBuddyMongoUserService, PinBuddyMongoPinService],
  exports: [PinBuddyMongoAnalyticLogService, PinBuddyMongoUserService, PinBuddyMongoPinService],
})
export class PinBuddyMongoModule {}
