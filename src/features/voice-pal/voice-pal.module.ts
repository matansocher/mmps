import { Module } from '@nestjs/common';
import { VoicePalMongoModule } from '@core/mongo/voice-pal-mongo';
import { NotifierModule } from '@core/notifier';
import { OpenaiModule } from '@services/openai';
import { TelegramBotsFactoryProvider } from '@services/telegram';
import { UserSelectedActionsService } from './user-selected-actions.service';
import { BOT_CONFIG } from './voice-pal.config';
import { VoicePalController } from './voice-pal.controller';
import { VoicePalService } from './voice-pal.service';

@Module({
  imports: [OpenaiModule, NotifierModule, VoicePalMongoModule],
  providers: [VoicePalController, VoicePalService, UserSelectedActionsService, TelegramBotsFactoryProvider(BOT_CONFIG)],
})
export class VoicePalModule {}
