import { Module } from '@nestjs/common';
import { VoicePalMongoModule } from '@core/mongo/voice-pal-mongo';
import { NotifierBotModule } from '@core/notifier-bot';
import { OpenaiModule } from '@services/openai';
import { BOTS, TelegramBotsFactoryProvider } from '@services/telegram';
import { UserSelectedActionsService } from './user-selected-actions.service';
import { VoicePalBotService } from './voice-pal-bot.service';
import { VoicePalService } from './voice-pal.service';

@Module({
  imports: [OpenaiModule, NotifierBotModule, VoicePalMongoModule],
  providers: [VoicePalBotService, VoicePalService, UserSelectedActionsService, TelegramBotsFactoryProvider(BOTS.VOICE_PAL)],
  exports: [TelegramBotsFactoryProvider(BOTS.VOICE_PAL)],
})
export class VoicePalBotModule {}
