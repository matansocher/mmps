import { Module } from '@nestjs/common';
import { LoggerModule } from '@core/logger/logger.module';
import { MongoDatabaseFactoryModule } from '@core/mongo/shared/mongo-database-factory.module';
import { VoicePalMongoUserService, VoicePalMongoAnalyticLogService } from '@core/mongo/voice-pal-mongo/services';
import { UtilsModule } from '@core/utils/utils.module';
import { CONNECTION_NAME, DB_NAME, MONGO_DB_URL } from './voice-pal-mongo.config';

@Module({
  imports: [
    LoggerModule.forChild(VoicePalMongoModule.name),
    UtilsModule,
    MongoDatabaseFactoryModule.forChild({
      connectionName: CONNECTION_NAME,
      uri: MONGO_DB_URL,
      dbName: DB_NAME,
    }),
  ],
  providers: [VoicePalMongoUserService, VoicePalMongoAnalyticLogService],
  exports: [VoicePalMongoUserService, VoicePalMongoAnalyticLogService],
})
export class VoicePalMongoModule {}
