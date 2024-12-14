import { LoggerModule } from '@core/logger';
import { UtilsModule } from '@core/utils';
import { Module, OnModuleInit } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { Scores365Module } from 'src/services/scores-365';
import { BOTS, TelegramBotsFactoryModule, TelegramModule } from '@services/telegram';
import { CoachBotService } from './coach-bot.service';
import { CoachBotSchedulerService } from './coach-scheduler.service';

@Module({
  imports: [
    LoggerModule.forChild(CoachBotModule.name),
    UtilsModule,
    TelegramBotsFactoryModule.forChild(BOTS.COACH),
    TelegramModule,
    Scores365Module,
    ScheduleModule.forRoot(),
  ],
  providers: [CoachBotService, CoachBotSchedulerService],
})
export class CoachBotModule implements OnModuleInit {
  constructor(private readonly coachBotSchedulerService: CoachBotSchedulerService) {}

  onModuleInit(): void {
    // this.coachBotSchedulerService.handleIntervalFlow(); // for testing purposes
  }
}
