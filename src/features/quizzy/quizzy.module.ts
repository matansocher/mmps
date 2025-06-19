import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { QuizzyMongoModule } from '@core/mongo/quizzy-mongo';
import { NotifierModule } from '@core/notifier';
import { OpenaiModule } from '@services/openai';
import { TelegramBotsFactoryProvider } from '@services/telegram';
import { QuizzySchedulerService } from './quizzy-scheduler.service';
import { BOT_CONFIG } from './quizzy.config';
import { QuizzyController } from './quizzy.controller';
import { QuizzyService } from './quizzy.service';

@Module({
  imports: [ScheduleModule.forRoot(), QuizzyMongoModule, OpenaiModule, NotifierModule],
  providers: [QuizzyController, QuizzyService, QuizzySchedulerService, TelegramBotsFactoryProvider(BOT_CONFIG)],
})
export class QuizzyModule {}
