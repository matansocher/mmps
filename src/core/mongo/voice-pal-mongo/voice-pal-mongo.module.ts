import { Module } from '@nestjs/common';
import { MongoDatabaseFactoryModule } from '@core/mongo/shared';
import { VoicePalMongoUserService } from './services';
import { CONNECTION_NAME, DB_NAME } from './voice-pal-mongo.config';

@Module({
  imports: [
    MongoDatabaseFactoryModule.forChild({
      connectionName: CONNECTION_NAME,
      dbName: DB_NAME,
    }),
  ],
  providers: [VoicePalMongoUserService],
  exports: [VoicePalMongoUserService],
})
export class VoicePalMongoModule {}
