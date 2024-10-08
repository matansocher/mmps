import { Module, OnModuleInit } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { LoggerModule } from '@core/logger';
import { NotifierBotModule } from '@core/notifier-bot/notifier-bot.module';
import { UtilsModule } from '@core/utils';
import { WoltMongoModule } from '@core/mongo/wolt-mongo';
import { BOTS, TelegramBotsFactoryModule, TelegramModule } from '@services/telegram';
import { WoltModule } from '@services/wolt';
import { WoltBotService } from './wolt-bot.service';
import { WoltSchedulerService } from './wolt-scheduler.service';

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
