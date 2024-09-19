import { Module } from '@nestjs/common';
import { LoggerModule } from '@core/logger/logger.module';
import { UtilsModule } from '@core/utils/utils.module';
import { BOTS, TelegramModule, TelegramBotsFactoryModule } from '@services/telegram';
import { VoicePalModule } from '@services/voice-pal/voice-pal.module';
import { VoicePalBotService } from './voice-pal-bot.service';

@Module({
  imports: [
    LoggerModule.forChild(VoicePalBotModule.name),
    TelegramBotsFactoryModule.forChild(BOTS.VOICE_PAL),
    TelegramModule,
    UtilsModule,
    VoicePalModule,
  ],
  providers: [VoicePalBotService],
})
export class VoicePalBotModule {}
