import { VoicePalMongoService } from '@core/mongo/voice-pal-mongo/voice-pal-mongo.service';
import { Module } from '@nestjs/common';

@Module({
  providers: [VoicePalMongoService],
  exports: [VoicePalMongoService],
})
export class VoicePalMongoModule {}
