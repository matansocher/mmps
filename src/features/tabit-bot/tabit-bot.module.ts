import { Module, OnModuleInit } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { LoggerModule } from '@core/logger';
import { TabitMongoModule } from '@core/mongo/tabit-mongo';
import { NotifierBotModule } from '@core/notifier-bot/notifier-bot.module';
import { UtilsModule } from '@core/utils';
import { TabitApiModule } from '@services/tabit/tabit-api/tabit-api.module';
import { TabitFlowModule } from '@services/tabit/tabit-flow/tabit-flow.module';
import { BOTS } from '@services/telegram/telegram.config';
import { TelegramModule } from '@services/telegram/telegram.module';
import { TelegramBotsFactoryModule } from '@services/telegram/telegram-bots-factory/telegram-bots-factory.module';
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
