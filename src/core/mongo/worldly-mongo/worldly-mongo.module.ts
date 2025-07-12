import { Module } from '@nestjs/common';
import { MongoDatabaseFactoryModule } from '@core/mongo/shared';
import { WorldlyMongoCountryService, WorldlyMongoGameLogService, WorldlyMongoStateService, WorldlyMongoSubscriptionService, WorldlyMongoUserService } from './services';
import { CONNECTION_NAME, DB_NAME } from './worldly-mongo.config';

@Module({
  imports: [
    MongoDatabaseFactoryModule.forChild({
      connectionName: CONNECTION_NAME,
      dbName: DB_NAME,
    }),
  ],
  providers: [WorldlyMongoSubscriptionService, WorldlyMongoUserService, WorldlyMongoGameLogService, WorldlyMongoCountryService, WorldlyMongoStateService],
  exports: [WorldlyMongoSubscriptionService, WorldlyMongoUserService, WorldlyMongoGameLogService, WorldlyMongoCountryService, WorldlyMongoStateService],
})
export class WorldlyMongoModule {}
