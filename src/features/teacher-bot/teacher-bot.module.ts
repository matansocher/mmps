import { Module, OnModuleInit } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { LoggerModule } from '@core/logger';
import { TeacherMongoModule } from '@core/mongo/teacher-mongo';
import { NotifierBotModule } from '@core/notifier-bot';
import { UtilsModule } from '@core/utils';
import { OpenaiModule } from '@services/openai';
import { TeacherModule } from '@services/teacher/teacher.module';
import { BOTS, TelegramBotsFactoryModule, TelegramModule } from '@services/telegram';
import { TeacherBotService } from './teacher-bot.service';
import { TeacherSchedulerService } from './teacher-scheduler.service';

@Module({
  imports: [
    LoggerModule.forChild(TeacherBotModule.name),
    UtilsModule,
    NotifierBotModule,
    TelegramBotsFactoryModule.forChild(BOTS.PROGRAMMING_TEACHER),
    TelegramModule,
    OpenaiModule,
    TeacherModule,
    TeacherMongoModule,
    ScheduleModule.forRoot(),
  ],
  providers: [TeacherBotService, TeacherSchedulerService],
})
export class TeacherBotModule implements OnModuleInit {
  constructor(private readonly teacherSchedulerService: TeacherSchedulerService) {}

  onModuleInit(): void {
    // this.teacherSchedulerService.handleCourseFirstLesson(); // for testing purposes
    // this.teacherSchedulerService.handleCourseNextLesson(); // for testing purposes
  }
}
