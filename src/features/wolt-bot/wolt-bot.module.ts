import { Module } from '@nestjs/common';
import { LoggerModule } from '@core/logger/logger.module';
import { WoltMongoModule } from '@core/mongo/wolt-mongo/wolt-mongo.module';
import { WoltSchedulerService } from '@features/wolt-bot/wolt-scheduler.service';
import { BOTS, TelegramBotsFactoryModule, TelegramModule } from '@services/telegram';
import { UtilsModule } from '@services/utils';
import { WoltUtilsService } from '@services/wolt';
import { WoltModule } from '@services/wolt';
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
