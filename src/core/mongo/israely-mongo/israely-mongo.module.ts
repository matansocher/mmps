import { Module } from '@nestjs/common';
import { MongoDatabaseFactoryModule } from '@core/mongo/shared';
import { CONNECTION_NAME, DB_NAME } from './israely-mongo.config';
import { IsraelyMongoGameLogService, IsraelyMongoSubscriptionService, IsraelyMongoUserService } from './services';

@Module({
  imports: [
    MongoDatabaseFactoryModule.forChild({
      connectionName: CONNECTION_NAME,
      dbName: DB_NAME,
    }),
  ],
  providers: [IsraelyMongoSubscriptionService, IsraelyMongoUserService, IsraelyMongoGameLogService],
  exports: [IsraelyMongoSubscriptionService, IsraelyMongoUserService, IsraelyMongoGameLogService],
})
export class IsraelyMongoModule {}
