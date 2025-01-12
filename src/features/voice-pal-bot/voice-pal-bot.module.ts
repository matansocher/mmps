import { Module } from '@nestjs/common';
import { BOTS, TelegramModule, TelegramBotsFactoryModule } from '@services/telegram';
import { VoicePalModule } from '@services/voice-pal';
import { VoicePalBotService } from './voice-pal-bot.service';

@Module({
  imports: [
    TelegramBotsFactoryModule.forChild(BOTS.VOICE_PAL),
    TelegramModule,
    VoicePalModule,
  ],
  providers: [VoicePalBotService],
})
export class VoicePalBotModule {}
