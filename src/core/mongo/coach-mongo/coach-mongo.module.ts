import { Module } from '@nestjs/common';
import { MongoDatabaseFactoryModule } from '@core/mongo/shared';
import { CoachMongoSubscriptionService, CoachMongoUserService } from './services';
import { CONNECTION_NAME, DB_NAME, MONGO_DB_URL } from './coach-mongo.config';

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
