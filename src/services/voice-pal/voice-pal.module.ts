import { VoicePalMongoModule } from '@core/mongo/voice-pal-mongo/voice-pal-mongo.module';
import { Module } from '@nestjs/common';
import { UserSelectedActionsService } from '@services/voice-pal/user-selected-actions.service';
import { VoicePalService } from './voice-pal.service';

@Module({
  imports: [VoicePalMongoModule],
  providers: [VoicePalService, UserSelectedActionsService],
  exports: [VoicePalService, UserSelectedActionsService],
})
export class VoicePalModule {}
