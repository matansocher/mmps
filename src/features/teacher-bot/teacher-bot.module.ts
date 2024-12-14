import { Module, OnModuleInit } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { LoggerModule } from '@core/logger';
import { UtilsModule } from '@core/utils';
import { GoogleSearchModule } from '@services/google-search';
import { OpenaiModule } from '@services/openai';
import { BOTS, TelegramBotsFactoryModule, TelegramModule } from '@services/telegram';
import { TeacherBotService } from './teacher-bot.service';
import { TeacherSchedulerService } from './teacher-scheduler.service';

@Module({
  imports: [
    LoggerModule.forChild(TeacherBotModule.name),
    UtilsModule,
    TelegramBotsFactoryModule.forChild(BOTS.TEACHER),
    TelegramModule,
    OpenaiModule,
    GoogleSearchModule,
    ScheduleModule.forRoot(),
  ],
  providers: [TeacherBotService, TeacherSchedulerService],
})
export class TeacherBotModule implements OnModuleInit {
  constructor(private readonly teacherSchedulerService: TeacherSchedulerService) {}

  onModuleInit(): void {
    // this.teacherSchedulerService.handleIntervalFlow('איך ליצור תקציב אישי'); // for testing purposes
    this.teacherSchedulerService.handleIntervalFlow('angular signals'); // for testing purposes
  }
}
