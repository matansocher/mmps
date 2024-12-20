import { isProd } from '@core/config';
import { LoggerModule } from '@core/logger';
import { UtilsModule } from '@core/utils';
import { RollinsparkSchedulerService } from '@features/rollinspark/rollinspark-scheduler.service';
import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { BOTS, TelegramBotsFactoryModule, TelegramModule } from '@services/telegram';
import { RollinsparkService } from './rollinspark.service';

@Module({
  imports: [
    LoggerModule.forChild(RollinsparkModule.name),
    ScheduleModule.forRoot(),
    TelegramBotsFactoryModule.forChild(BOTS.ROLLINSPARK),
    TelegramModule,
    UtilsModule,
  ],
  providers: [RollinsparkService, RollinsparkSchedulerService],
})
export class RollinsparkModule {
  constructor(private readonly rollinsparkSchedulerService: RollinsparkSchedulerService) {}

  onModuleInit(): void {
    // this.rollinsparkSchedulerService.handleIntervalFlow(); // for testing purposes
    if (isProd) {
      // this.rollinsparkSchedulerService.notifyOnStart();
    }
  }
}
