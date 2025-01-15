import { Module } from '@nestjs/common';
import { MongoDatabaseFactoryModule } from '@core/mongo/shared';
import { RollinsparkMongoSubscriptionService, RollinsparkMongoUserService } from './services';
import { CONNECTION_NAME, DB_NAME } from './rollinspark-mongo.config';

@Module({
  imports: [
    MongoDatabaseFactoryModule.forChild({
      connectionName: CONNECTION_NAME,
      dbName: DB_NAME,
    }),
  ],
  providers: [RollinsparkMongoSubscriptionService, RollinsparkMongoUserService],
  exports: [RollinsparkMongoSubscriptionService, RollinsparkMongoUserService],
})
export class RollinsparkMongoModule {}
