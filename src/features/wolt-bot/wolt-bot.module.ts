import { Module, OnModuleInit } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { LoggerModule } from '@core/logger';
import { NotifierBotModule } from '@core/notifier-bot/notifier-bot.module';
import { UtilsModule } from '@core/utils';
import { WoltMongoModule } from '@core/mongo/wolt-mongo';
import { BOTS } from '@services/telegram/telegram.config';
import { TelegramBotsFactoryModule } from '@services/telegram/telegram-bots-factory/telegram-bots-factory.module';
import { TelegramModule } from '@services/telegram/telegram.module';
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
