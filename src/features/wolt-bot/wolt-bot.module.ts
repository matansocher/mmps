import { Module, OnModuleInit } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { LoggerModule } from '@core/logger/logger.module';
import { NotifierBotModule } from '@core/notifier-bot/notifier-bot.module';
import { UtilsModule } from '@core/utils/utils.module';
import { WoltMongoModule } from '@core/mongo/wolt-mongo/wolt-mongo.module';
import { WoltSchedulerService } from '@features/wolt-bot/wolt-scheduler.service';
import { BOTS, TelegramBotsFactoryModule, TelegramModule } from '@services/telegram';
import { WoltModule } from '@services/wolt/wolt.module';
import { WoltBotService } from './wolt-bot.service';

@Module({
  imports: [
    LoggerModule.forChild(WoltBotModule.name),
    NotifierBotModule,
    ScheduleModule.forRoot(),
    TelegramBotsFactoryModule.forChild(BOTS.WOLT),
    TelegramModule,
    UtilsModule,
    WoltModule,
    WoltMongoModule,
  ],
  providers: [WoltBotService, WoltSchedulerService],
})
export class WoltBotModule implements OnModuleInit {
  constructor(private readonly woltSchedulerService: WoltSchedulerService) {}

  onModuleInit(): void {
    this.woltSchedulerService.scheduleInterval();
  }
}
