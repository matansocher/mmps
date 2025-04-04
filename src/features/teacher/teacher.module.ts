import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TeacherMongoModule } from '@core/mongo/teacher-mongo';
import { NotifierModule } from '@core/notifier';
import { OpenaiModule } from '@services/openai';
import { BOTS, TelegramBotsFactoryProvider } from '@services/telegram';
import { TeacherSchedulerService } from './teacher-scheduler.service';
import { TeacherController } from './teacher.controller';
import { TeacherService } from './teacher.service';

@Module({
  imports: [NotifierModule, OpenaiModule, TeacherMongoModule, NotifierModule, ScheduleModule.forRoot()],
  providers: [TeacherController, TeacherSchedulerService, TeacherService, TelegramBotsFactoryProvider(BOTS.PROGRAMMING_TEACHER)],
  exports: [TelegramBotsFactoryProvider(BOTS.PROGRAMMING_TEACHER)],
})
export class TeacherModule {}
