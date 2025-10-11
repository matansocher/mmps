import { Module } from '@nestjs/common';
import { TelegramBotsFactoryProvider } from '@services/telegram';
import { BOT_CONFIG } from './notifier.config';
import { NotifierController } from './notifier.controller';
import { NotifierService } from './notifier.service';

@Module({
  providers: [NotifierController, NotifierService, TelegramBotsFactoryProvider(BOT_CONFIG)],
  exports: [NotifierService],
})
export class NotifierModule {}
