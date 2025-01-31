import { Module } from '@nestjs/common';
import { MongoDatabaseFactoryModule } from '@core/mongo/shared';
import { WoltMongoSubscriptionService, WoltMongoUserService } from './services';
import { CONNECTION_NAME, DB_NAME } from './wolt-mongo.config';

@Module({
  imports: [
    MongoDatabaseFactoryModule.forChild({
      connectionName: CONNECTION_NAME,
      dbName: DB_NAME,
    }),
  ],
  providers: [WoltMongoSubscriptionService, WoltMongoUserService],
  exports: [WoltMongoSubscriptionService, WoltMongoUserService],
})
export class WoltMongoModule {}
