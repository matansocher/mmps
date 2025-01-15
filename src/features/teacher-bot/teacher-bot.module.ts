import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TeacherMongoModule } from '@core/mongo/teacher-mongo';
import { NotifierBotModule } from '@core/notifier-bot';
import { AiModule } from '@services/ai';
import { OpenaiModule } from '@services/openai';
import { BOTS, TelegramBotsFactoryModule, TelegramModule } from '@services/telegram';
import { TeacherBotService } from './teacher-bot.service';
import { TeacherSchedulerService } from './teacher-scheduler.service';
import { TeacherService } from './teacher.service';

@Module({
  imports: [
    NotifierBotModule,
    TelegramBotsFactoryModule.forChild(BOTS.PROGRAMMING_TEACHER),
    TelegramModule,
    AiModule,
    OpenaiModule,
    TeacherMongoModule,
    NotifierBotModule,
    ScheduleModule.forRoot(),
  ],
  providers: [TeacherBotService, TeacherSchedulerService, TeacherService],
})
export class TeacherBotModule {}
