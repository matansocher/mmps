import { Module } from '@nestjs/common';
import { VoicePalMongoService } from '@core/mongo/voice-pal-mongo/voice-pal-mongo.service';

@Module({
  providers: [VoicePalMongoService],
  exports: [VoicePalMongoService],
})
export class VoicePalMongoModule {}
