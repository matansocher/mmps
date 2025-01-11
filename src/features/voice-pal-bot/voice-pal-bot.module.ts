import { Module } from '@nestjs/common';
import { LoggerModule } from '@core/logger';
import { BOTS, TelegramModule, TelegramBotsFactoryModule } from '@services/telegram';
import { VoicePalModule } from '@services/voice-pal';
import { VoicePalBotService } from './voice-pal-bot.service';

@Module({
  imports: [
    LoggerModule.forChild(VoicePalBotModule.name),
    TelegramBotsFactoryModule.forChild(BOTS.VOICE_PAL),
    TelegramModule,
    VoicePalModule,
  ],
  providers: [VoicePalBotService],
})
export class VoicePalBotModule {}
