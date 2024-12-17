import { LoggerModule } from '@core/logger';
import { UtilsModule } from '@core/utils';
import { Module } from '@nestjs/common';
import { BOTS, TelegramBotsFactoryModule, TelegramModule } from '@services/telegram';
import { NotifierBotService } from './notifier-bot.service';

@Module({
  imports: [LoggerModule.forChild(NotifierBotModule.name), UtilsModule, TelegramModule, TelegramBotsFactoryModule.forChild(BOTS.NOTIFIER)],
  providers: [NotifierBotService],
  exports: [NotifierBotService],
})
export class NotifierBotModule {}
