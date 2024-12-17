import { LoggerModule } from '@core/logger';
import { TabitMongoModule } from '@core/mongo/tabit-mongo';
import { NotifierBotModule } from '@core/notifier-bot/notifier-bot.module';
import { UtilsModule } from '@core/utils';
import { Module, OnModuleInit } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TabitApiModule, TabitFlowModule } from '@services/tabit';
import { BOTS, TelegramBotsFactoryModule, TelegramModule } from '@services/telegram';
import { TabitBotService } from './tabit-bot.service';
import { TabitSchedulerService } from './tabit-scheduler.service';

@Module({
  imports: [
    LoggerModule.forChild(TabitBotModule.name),
    NotifierBotModule,
    ScheduleModule.forRoot(),
    TabitApiModule,
    TabitFlowModule,
    TabitMongoModule,
    TelegramBotsFactoryModule.forChild(BOTS.TABIT),
    TelegramModule,
    UtilsModule,
  ],
  providers: [TabitBotService, TabitSchedulerService],
})
export class TabitBotModule implements OnModuleInit {
  constructor(private readonly tabitSchedulerService: TabitSchedulerService) {}

  onModuleInit(): void {
    this.tabitSchedulerService.scheduleInterval();
  }
}
