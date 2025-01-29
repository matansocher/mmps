import { Module } from '@nestjs/common';
import { MongoDatabaseFactoryModule } from '@core/mongo/shared';
import { CONNECTION_NAME, DB_NAME } from './coach-mongo.config';
import { CoachMongoSubscriptionService, CoachMongoUserService } from './services';

@Module({
  imports: [
    MongoDatabaseFactoryModule.forChild({
      connectionName: CONNECTION_NAME,
      dbName: DB_NAME,
    }),
  ],
  providers: [CoachMongoSubscriptionService, CoachMongoUserService],
  exports: [CoachMongoSubscriptionService, CoachMongoUserService],
})
export class CoachMongoModule {}
