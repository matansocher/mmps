import { Module } from '@nestjs/common';
import { VoicePalMongoModule } from '@core/mongo/voice-pal-mongo';
import { NotifierModule } from '@core/notifier';
import { OpenaiModule } from '@services/openai';
import { BOTS, TelegramBotsFactoryProvider } from '@services/telegram';
import { UserSelectedActionsService } from './user-selected-actions.service';
import { VoicePalController } from './voice-pal.controller';
import { VoicePalService } from './voice-pal.service';

@Module({
  imports: [OpenaiModule, NotifierModule, VoicePalMongoModule],
  providers: [VoicePalController, VoicePalService, UserSelectedActionsService, TelegramBotsFactoryProvider(BOTS.VOICE_PAL)],
  exports: [TelegramBotsFactoryProvider(BOTS.VOICE_PAL)],
})
export class VoicePalModule {}
