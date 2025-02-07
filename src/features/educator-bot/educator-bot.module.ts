import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { EducatorMongoModule } from '@core/mongo/educator-mongo';
import { NotifierBotModule } from '@core/notifier-bot';
import { OpenaiModule } from '@services/openai';
import { BOTS, TelegramBotsFactoryProvider } from '@services/telegram';
import { EducatorBotService } from './educator-bot.service';
import { EducatorSchedulerService } from './educator-scheduler.service';
import { EducatorService } from './educator.service';

@Module({
  imports: [NotifierBotModule, OpenaiModule, EducatorMongoModule, NotifierBotModule, ScheduleModule.forRoot()],
  providers: [EducatorBotService, EducatorSchedulerService, EducatorService, TelegramBotsFactoryProvider(BOTS.EDUCATOR)],
})
export class EducatorBotModule {}
