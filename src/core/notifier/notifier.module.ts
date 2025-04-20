import { Module } from '@nestjs/common';
import { TelegramBotsFactoryProvider } from '@services/telegram';
import { BOT_CONFIG } from './notifier.config';
import { NotifierService } from './notifier.service';

@Module({
  providers: [NotifierService, TelegramBotsFactoryProvider(BOT_CONFIG)],
  exports: [NotifierService],
})
export class NotifierModule {}
