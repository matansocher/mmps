import { Module } from '@nestjs/common';
import { BOTS, TelegramBotsFactoryProvider } from '@services/telegram';
import { NotifierService } from './notifier.service';

@Module({
  providers: [NotifierService, TelegramBotsFactoryProvider(BOTS.NOTIFIER)],
  exports: [NotifierService],
})
export class NotifierModule {}
