import { Module } from '@nestjs/common';
import { TELEGRAM_BOT_WOLT_INJECTOR } from '@core/config/telegram.config';
import { LoggerModule } from '@core/logger/logger.module';
import { WoltMongoModule } from '@core/mongo/wolt-mongo/wolt-mongo.module';
import { WoltSchedulerService } from '@features/wolt-bot/wolt-scheduler.service';
import { TelegramBotsFactoryModule } from '@services/telegram/telegram-bots-factory/telegram-bots-factory.module';
import { TelegramModule } from '@services/telegram/telegram.module';
import { UtilsModule } from '@services/utils/utils.module';
import { WoltModule } from '@services/wolt/wolt.module';
import { WoltBotService } from './wolt-bot.service';

@Module({
  imports: [
    LoggerModule,
    UtilsModule,
    TelegramModule,
    WoltModule,
    WoltMongoModule,
    TelegramBotsFactoryModule.forRoot({ botName: TELEGRAM_BOT_WOLT_INJECTOR }),
  ],
  providers: [WoltBotService, WoltSchedulerService],
})
export class WoltBotModule {}
