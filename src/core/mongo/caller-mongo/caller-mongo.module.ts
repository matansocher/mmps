import { Module } from '@nestjs/common';
import { MongoDatabaseFactoryModule } from '@core/mongo/shared';
import { CONNECTION_NAME, DB_NAME } from './caller-mongo.config';
import { CallerMongoSubscriptionService } from './services';

@Module({
  imports: [
    MongoDatabaseFactoryModule.forChild({
      connectionName: CONNECTION_NAME,
      dbName: DB_NAME,
    }),
  ],
  providers: [CallerMongoSubscriptionService],
  exports: [CallerMongoSubscriptionService],
})
export class CallerMongoModule {}
