import { LoggerModule } from '@core/logger';
import { NewsMongoModule } from '@core/mongo/news-mongo';
import { UtilsModule } from '@core/utils';
import { Module } from '@nestjs/common';
import { OpenaiModule } from '@services/openai';
import {
  TELEGRAM_API_HASH,
  TELEGRAM_API_ID,
  TELEGRAM_CLIENT_TOKEN,
  TELEGRAM_STRING_SESSION,
  TelegramClientFactoryModule,
  TelegramClientModule,
} from '@services/telegram-client';
import { NewsService } from './news.service';

@Module({
  imports: [
    LoggerModule.forChild(NewsModule.name),
    UtilsModule,
    TelegramClientModule,
    TelegramClientFactoryModule.forChild({
      name: TELEGRAM_CLIENT_TOKEN,
      stringSession: TELEGRAM_STRING_SESSION,
      apiId: parseInt(TELEGRAM_API_ID),
      apiHash: TELEGRAM_API_HASH,
    }),
    OpenaiModule,
    NewsMongoModule,
  ],
  providers: [NewsService],
  exports: [NewsService],
})
export class NewsModule {}
