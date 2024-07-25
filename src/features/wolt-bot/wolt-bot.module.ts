import { BOTS } from '@core/config/telegram.config';
import { LoggerModule } from '@core/logger/logger.module';
import { Module } from '@nestjs/common';
import { TelegramModule } from '@services/telegram/telegram.module';
import { WoltBotService } from './wolt-bot.service';

@Module({
  imports: [TelegramModule, LoggerModule],
  providers: [WoltBotService],
})
export class WoltBotModule {}
