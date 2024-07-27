import { MongoDatabaseFactoryModule } from '@core/mongo/shared/mongo-database-factory.module';
import { VoicePalMongoUserService, VoicePalMongoAnalyticLogService } from '@core/mongo/voice-pal-mongo/services';
import { Module } from '@nestjs/common';
import { CONNECTION_NAME, DB_NAME, MONGO_DB_URL } from './voice-pal-mongo.config';

@Module({
  imports: [
    MongoDatabaseFactoryModule.forRoot({
      connectionName: CONNECTION_NAME,
      uri: MONGO_DB_URL,
      dbName: DB_NAME,
    }),
  ],
  providers: [VoicePalMongoUserService, VoicePalMongoAnalyticLogService],
  exports: [VoicePalMongoUserService, VoicePalMongoAnalyticLogService],
})
export class VoicePalMongoModule {}
