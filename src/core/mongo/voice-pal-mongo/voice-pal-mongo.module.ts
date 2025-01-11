import { Module } from '@nestjs/common';
import { LoggerModule } from '@core/logger';
import { MongoDatabaseFactoryModule } from '@core/mongo/shared';
import { VoicePalMongoUserService } from './services';
import { CONNECTION_NAME, DB_NAME, MONGO_DB_URL } from './voice-pal-mongo.config';

@Module({
  imports: [
    LoggerModule.forChild(VoicePalMongoModule.name),
    MongoDatabaseFactoryModule.forChild({
      connectionName: CONNECTION_NAME,
      uri: MONGO_DB_URL,
      dbName: DB_NAME,
    }),
  ],
  providers: [VoicePalMongoUserService],
  exports: [VoicePalMongoUserService],
})
export class VoicePalMongoModule {}
