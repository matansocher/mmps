import { Module, OnModuleInit } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { createMongoConnection } from '@core/mongo';
import { NotifierModule } from '@core/notifier';
import { TelegramBotsFactoryProvider } from '@services/telegram';
import { DB_NAME } from './mongo';
import { WoltSchedulerService } from './wolt-scheduler.service';
import { BOT_CONFIG } from './wolt.config';
import { WoltController } from './wolt.controller';

@Module({
  imports: [ScheduleModule.forRoot(), NotifierModule],
  providers: [WoltController, WoltSchedulerService, TelegramBotsFactoryProvider(BOT_CONFIG)],
})
export class WoltModule implements OnModuleInit {
  constructor(private readonly woltSchedulerService: WoltSchedulerService) {}

  async onModuleInit() {
    await createMongoConnection(DB_NAME);
    await this.woltSchedulerService.scheduleInterval();
  }
}
