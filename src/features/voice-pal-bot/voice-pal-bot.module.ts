import { LoggerModule } from '@core/logger/logger.module';
import { Module } from '@nestjs/common';
import { BOTS } from '@services/telegram';
import { TelegramBotsFactoryModule } from '@services/telegram';
import { TelegramModule } from '@services/telegram';
import { UtilsModule } from '@services/utils';
import { VoicePalModule } from '@services/voice-pal';
import { VoicePalBotService } from './voice-pal-bot.service';

@Module({
  imports: [
    LoggerModule.forRoot(VoicePalBotModule.name),
    UtilsModule,
    VoicePalModule,
    TelegramModule,
    TelegramBotsFactoryModule.forRoot({ botName: BOTS.VOICE_PAL.name }),
  ],
  providers: [VoicePalBotService],
})
export class VoicePalBotModule {}
