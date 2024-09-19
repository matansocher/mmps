import { Module } from '@nestjs/common';
import { LoggerModule } from '@core/logger/logger.module';
import { UtilsModule } from '@core/utils/utils.module';
import { BOTS, TelegramModule, TelegramBotsFactoryModule } from '@services/telegram';
import { NotifierBotService } from './notifier-bot.service';

@Module({
  imports: [
    LoggerModule.forChild(NotifierBotModule.name),
    UtilsModule,
    TelegramModule,
    TelegramBotsFactoryModule.forChild(BOTS.NOTIFIER),
  ],
  providers: [NotifierBotService],
  exports: [NotifierBotService],
})
export class NotifierBotModule {}
