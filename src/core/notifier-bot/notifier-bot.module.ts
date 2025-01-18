import { Module } from '@nestjs/common';
import { BOTS, TelegramBotsFactoryModule } from '@services/telegram';
import { NotifierBotService } from './notifier-bot.service';

@Module({
  imports: [TelegramBotsFactoryModule.forChild(BOTS.NOTIFIER)],
  providers: [NotifierBotService],
  exports: [NotifierBotService],
})
export class NotifierBotModule {}
