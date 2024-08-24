import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { LoggerModule } from '@core/logger/logger.module';
import { WoltMongoModule } from '@core/mongo/wolt-mongo/wolt-mongo.module';
import { UtilsModule } from '@core/utils/utils.module';
import { WoltSchedulerService } from '@features/wolt-bot/wolt-scheduler.service';
import { BOTS } from '@services/telegram/telegram.config';
import { TelegramModule } from '@services/telegram/telegram.module';
import { TelegramBotsFactoryModule } from '@services/telegram/telegram-bots-factory/telegram-bots-factory.module';
import { WoltModule } from '@services/wolt/wolt.module';
import { WoltUtilsService } from '@services/wolt/wolt-utils.service';
import { WoltBotService } from './wolt-bot.service';

@Module({
  imports: [
    LoggerModule.forChild(WoltBotModule.name),
    UtilsModule,
    TelegramModule,
    WoltModule,
    WoltMongoModule,
    TelegramBotsFactoryModule.forChild(BOTS.WOLT),
    ScheduleModule.forRoot(),
  ],
  providers: [WoltBotService, WoltSchedulerService, WoltUtilsService],
})
export class WoltBotModule {}
