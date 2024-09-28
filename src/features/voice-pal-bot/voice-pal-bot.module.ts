import { Module } from '@nestjs/common';
import { LoggerModule } from '@core/logger';
import { UtilsModule } from '@core/utils';
import { BOTS } from '@services/telegram/telegram.config';
import { TelegramModule } from '@services/telegram/telegram.module';
import { TelegramBotsFactoryModule } from '@services/telegram/telegram-bots-factory/telegram-bots-factory.module';
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
