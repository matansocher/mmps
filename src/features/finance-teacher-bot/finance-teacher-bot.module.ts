import { Module, OnModuleInit } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { LoggerModule } from '@core/logger';
import { UtilsModule } from '@core/utils';
import { OpenaiModule } from '@services/openai';
import { BOTS, TelegramBotsFactoryModule, TelegramModule } from '@services/telegram';
import { FinanceTeacherBotService } from './finance-teacher-bot.service';
import { FinanceTeacherSchedulerService } from './finance-teacher-scheduler.service';

@Module({
  imports: [
    LoggerModule.forChild(FinanceTeacherBotModule.name),
    UtilsModule,
    TelegramBotsFactoryModule.forChild(BOTS.FINANCE_TEACHER),
    TelegramModule,
    OpenaiModule,
    ScheduleModule.forRoot(),
  ],
  providers: [FinanceTeacherBotService, FinanceTeacherSchedulerService],
})
export class FinanceTeacherBotModule implements OnModuleInit {
  constructor(private readonly financeTeacherSchedulerService: FinanceTeacherSchedulerService) {}

  onModuleInit(): void {
    this.financeTeacherSchedulerService.handleIntervalFlow('איך ליצור תקציב אישי'); // for testing purposes
  }
}
