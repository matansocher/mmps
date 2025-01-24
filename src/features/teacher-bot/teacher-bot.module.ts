import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TeacherMongoModule } from '@core/mongo/teacher-mongo';
import { NotifierBotModule } from '@core/notifier-bot';
import { AiModule } from '@services/ai';
import { OpenaiModule } from '@services/openai';
import { BOTS, TelegramBotsFactoryProvider } from '@services/telegram';
import { TeacherBotService } from './teacher-bot.service';
import { TeacherSchedulerService } from './teacher-scheduler.service';
import { TeacherService } from './teacher.service';

@Module({
  imports: [
    NotifierBotModule,
    AiModule,
    OpenaiModule,
    TeacherMongoModule,
    NotifierBotModule,
    ScheduleModule.forRoot(),
  ],
  providers: [TeacherBotService, TeacherSchedulerService, TeacherService, TelegramBotsFactoryProvider(BOTS.PROGRAMMING_TEACHER)],
})
export class TeacherBotModule {}
