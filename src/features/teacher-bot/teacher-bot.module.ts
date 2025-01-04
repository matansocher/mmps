import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { LoggerModule } from '@core/logger';
import { TeacherMongoModule } from '@core/mongo/teacher-mongo';
import { NotifierBotModule } from '@core/notifier-bot';
import { UtilsModule } from '@core/utils';
import { OpenaiModule } from '@services/openai';
import { BOTS, TelegramBotsFactoryModule, TelegramModule } from '@services/telegram';
import { TeacherBotService } from './teacher-bot.service';
import { TeacherSchedulerService } from './teacher-scheduler.service';
import { TeacherService } from './teacher.service';

@Module({
  imports: [
    LoggerModule.forChild(TeacherBotModule.name),
    UtilsModule,
    NotifierBotModule,
    TelegramBotsFactoryModule.forChild(BOTS.PROGRAMMING_TEACHER),
    TelegramModule,
    OpenaiModule,
    TeacherMongoModule,
    ScheduleModule.forRoot(),
  ],
  providers: [TeacherBotService, TeacherSchedulerService, TeacherService],
})
export class TeacherBotModule {}
