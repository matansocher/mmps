import { LoggerModule } from '@core/logger/logger.module';
import { Module } from '@nestjs/common';
import { BOTS } from '@services/telegram/telegram.config';
import { TelegramBotsFactoryModule } from '@services/telegram/telegram-bots-factory/telegram-bots-factory.module';
import { TelegramModule } from '@services/telegram/telegram.module';
import { UtilsModule } from '@services/utils/utils.module';
import { VoicePalModule } from '@services/voice-pal/voice-pal.module';
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
