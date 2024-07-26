import { Module } from '@nestjs/common';
import { VoicePalService } from './voice-pal.service';

@Module({
  providers: [VoicePalService],
  exports: [VoicePalService],
})
export class VoicePalModule {}
