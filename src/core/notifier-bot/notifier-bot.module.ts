import { Module } from '@nestjs/common';
import { LoggerModule } from '@core/logger/logger.module';
import { UtilsModule } from '@core/utils/utils.module';
import { BOTS } from '@services/telegram/telegram.config';
import { TelegramModule } from '@services/telegram/telegram.module';
import { TelegramBotsFactoryModule } from '@services/telegram/telegram-bots-factory/telegram-bots-factory.module';
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
