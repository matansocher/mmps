import { NewsSchedulerService } from '@features/news/news-scheduler.service';
import { Module, OnModuleInit } from '@nestjs/common';
import { NewsMongoModule } from '@core/mongo/news-mongo';
import { ScheduleModule } from '@nestjs/schedule';
import { LoggerModule } from '@core/logger';
import { NotifierBotModule } from '@core/notifier-bot/notifier-bot.module';
import { UtilsModule } from '@core/utils';
import { NewsModule } from '@services/news';
import { OpenaiModule } from '@services/openai';
import { BOTS, TelegramBotsFactoryModule, TelegramModule } from '@services/telegram';
import { NewsBotService } from './news-bot.service';

@Module({
  imports: [
    LoggerModule.forChild(NewsBotModule.name),
    UtilsModule,
    TelegramBotsFactoryModule.forChild(BOTS.NEWS),
    TelegramModule,
    NewsModule,
    NewsMongoModule,
    NotifierBotModule,
    OpenaiModule,
    ScheduleModule.forRoot(),
  ],
  providers: [NewsBotService, NewsSchedulerService],
})
export class NewsBotModule implements OnModuleInit {
  constructor(private readonly newsSchedulerService: NewsSchedulerService) {}

  onModuleInit(): void {
    // this.newsSchedulerService.handleIntervalFlow(); // for testing purposes
  }
}
