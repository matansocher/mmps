import { Module } from '@nestjs/common';
import { TELEGRAM_BOT_VOICE_PAL_INJECTOR } from '@core/config/telegram.config';
import { WoltSchedulerService } from '@features/wolt-bot/wolt-scheduler.service';
import { TelegramBotsFactoryModule } from '@services/telegram/telegram-bots-factory/telegram-bots-factory.module';
import { TelegramModule } from '@services/telegram/telegram.module';
import { VoiceAplBotService } from './voice-apl-bot.service';

@Module({
  imports: [
    TelegramModule,
    TelegramBotsFactoryModule.forRoot({ botName: TELEGRAM_BOT_VOICE_PAL_INJECTOR }),
  ],
  providers: [VoiceAplBotService, WoltSchedulerService],
})
export class VoiceAplBotModule {}
