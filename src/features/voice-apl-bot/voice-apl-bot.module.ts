import { BOTS } from '@core/config/telegram.config';
import { LoggerModule } from '@core/logger/logger.module';
import { WoltSchedulerService } from '@features/wolt-bot/wolt-scheduler.service';
import { Module } from '@nestjs/common';
import { TelegramModule } from '@services/telegram/telegram.module';
import { VoiceAplBotService } from './voice-apl-bot.service';

@Module({
  imports: [TelegramModule, LoggerModule],
  providers: [VoiceAplBotService, WoltSchedulerService],
})
export class VoiceAplBotModule {}
