import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TeacherMongoModule } from '@core/mongo/teacher-mongo';
import { NotifierModule } from '@core/notifier';
import { OpenaiModule } from '@services/openai';
import { TelegramBotsFactoryProvider } from '@services/telegram';
import { TeacherSchedulerService } from './teacher-scheduler.service';
import { BOT_CONFIG } from './teacher.config';
import { TeacherController } from './teacher.controller';
import { TeacherService } from './teacher.service';

@Module({
  imports: [NotifierModule, OpenaiModule, TeacherMongoModule, ScheduleModule.forRoot()],
  providers: [TeacherController, TeacherSchedulerService, TeacherService, TelegramBotsFactoryProvider(BOT_CONFIG)],
})
export class TeacherModule {}
