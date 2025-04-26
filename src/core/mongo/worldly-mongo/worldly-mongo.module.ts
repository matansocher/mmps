import { Module } from '@nestjs/common';
import { MongoDatabaseFactoryModule } from '@core/mongo/shared';
import { WorldlyMongoSubscriptionService, WorldlyMongoUserService } from './services';
import { CONNECTION_NAME, DB_NAME } from './worldly-mongo.config';

@Module({
  imports: [
    MongoDatabaseFactoryModule.forChild({
      connectionName: CONNECTION_NAME,
      dbName: DB_NAME,
    }),
  ],
  providers: [WorldlyMongoSubscriptionService, WorldlyMongoUserService],
  exports: [WorldlyMongoSubscriptionService, WorldlyMongoUserService],
})
export class WorldlyMongoModule {}
