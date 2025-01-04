import { Module, OnModuleInit } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { LoggerModule } from '@core/logger';
import { NotifierBotModule } from '@core/notifier-bot';
import { UtilsModule } from '@core/utils';
import { Scores365Module } from '@services/scores-365';
import { BOTS, TelegramBotsFactoryModule, TelegramModule } from '@services/telegram';
import { CoachBotService } from './coach-bot.service';
import { CoachBotSchedulerService } from './coach-scheduler.service';

@Module({
  imports: [
    LoggerModule.forChild(CoachBotModule.name),
    ScheduleModule.forRoot(),
    UtilsModule,
    NotifierBotModule,
    TelegramBotsFactoryModule.forChild(BOTS.COACH),
    TelegramModule,
    Scores365Module,
  ],
  providers: [CoachBotService, CoachBotSchedulerService],
})
export class CoachBotModule implements OnModuleInit {
  constructor(private readonly coachBotSchedulerService: CoachBotSchedulerService) {}

  onModuleInit(): void {
    // this.coachBotSchedulerService.handleIntervalFlow(); // for testing purposes
  }
}
