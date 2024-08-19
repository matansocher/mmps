import { Module } from '@nestjs/common';
import { BOTS } from '@services/telegram/telegram.config';
import { LoggerModule } from '@core/logger/logger.module';
import { WoltMongoModule } from '@core/mongo/wolt-mongo/wolt-mongo.module';
import { WoltSchedulerService } from '@features/wolt-bot/wolt-scheduler.service';
import { TelegramBotsFactoryModule } from '@services/telegram/telegram-bots-factory/telegram-bots-factory.module';
import { TelegramModule } from '@services/telegram/telegram.module';
import { UtilsModule } from '@core/utils/utils.module';
import { WoltUtilsService } from '@services/wolt/wolt-utils.service';
import { WoltModule } from '@services/wolt/wolt.module';
import { WoltBotService } from './wolt-bot.service';

@Module({
  imports: [
    LoggerModule.forRoot(WoltBotModule.name),
    UtilsModule,
    TelegramModule,
    WoltModule,
    WoltMongoModule,
    TelegramBotsFactoryModule.forRoot({ botName: BOTS.WOLT.name }),
  ],
  providers: [WoltBotService, WoltSchedulerService, WoltUtilsService],
})
export class WoltBotModule {}
