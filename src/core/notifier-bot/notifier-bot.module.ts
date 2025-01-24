import { Module } from '@nestjs/common';
import { BOTS, TelegramBotsFactoryProvider } from '@services/telegram';
import { NotifierBotService } from './notifier-bot.service';

@Module({
  providers: [NotifierBotService, TelegramBotsFactoryProvider(BOTS.NOTIFIER)],
  exports: [NotifierBotService],
})
export class NotifierBotModule {}
