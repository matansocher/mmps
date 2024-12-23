import { LoggerModule } from '@core/logger';
import { MongoDatabaseFactoryModule } from '@core/mongo/shared';
import { SelfieMongoDayDetailsService } from './services';
import { Module } from '@nestjs/common';
import { UtilsModule } from '@core/utils';
import { CONNECTION_NAME, DB_NAME, MONGO_DB_URL } from './selfie-mongo.config';

@Module({
  imports: [
    LoggerModule.forChild(SelfieMongoModule.name),
    UtilsModule,
    MongoDatabaseFactoryModule.forChild({
      connectionName: CONNECTION_NAME,
      uri: MONGO_DB_URL,
      dbName: DB_NAME,
    }),
  ],
  providers: [SelfieMongoDayDetailsService],
  exports: [SelfieMongoDayDetailsService],
})
export class SelfieMongoModule {}
