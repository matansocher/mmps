import { Module } from '@nestjs/common';
import { BOTS, TelegramBotsFactoryModule } from '@services/telegram';
import { VoicePalModule } from '@services/voice-pal';
import { VoicePalBotService } from './voice-pal-bot.service';

@Module({
  imports: [
    TelegramBotsFactoryModule.forChild(BOTS.VOICE_PAL),
    VoicePalModule,
  ],
  providers: [VoicePalBotService],
})
export class VoicePalBotModule {}
