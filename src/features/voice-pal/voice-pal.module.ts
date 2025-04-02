import { Module } from '@nestjs/common';
import { VoicePalMongoModule } from '@core/mongo/voice-pal-mongo';
import { NotifierBotModule } from '@core/notifier-bot';
import { OpenaiModule } from '@services/openai';
import { BOTS, TelegramBotsFactoryProvider } from '@services/telegram';
import { UserSelectedActionsService } from './user-selected-actions.service';
import { VoicePalController } from './voice-pal.controller';
import { VoicePalService } from './voice-pal.service';

@Module({
  imports: [OpenaiModule, NotifierBotModule, VoicePalMongoModule],
  providers: [VoicePalController, VoicePalService, UserSelectedActionsService, TelegramBotsFactoryProvider(BOTS.VOICE_PAL)],
  exports: [TelegramBotsFactoryProvider(BOTS.VOICE_PAL)],
})
export class VoicePalModule {}
