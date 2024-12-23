import { Module, OnModuleInit } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { LoggerModule } from '@core/logger';
import { SelfieMongoModule } from '@core/mongo/selfie-mongo';
import { NotifierBotModule } from '@core/notifier-bot/notifier-bot.module';
import { UtilsModule } from '@core/utils';
import {
  TELEGRAM_API_HASH,
  TELEGRAM_API_ID,
  TELEGRAM_CLIENT_TOKEN,
  TELEGRAM_STRING_SESSION,
  TelegramClientFactoryModule,
  TelegramClientModule,
} from '@services/telegram-client';
import { SelfieService } from './selfie.service';

@Module({
  imports: [
    LoggerModule.forChild(SelfieModule.name),
    UtilsModule,
    NotifierBotModule,
    TelegramClientModule,
    TelegramClientFactoryModule.forChild({
      name: TELEGRAM_CLIENT_TOKEN,
      stringSession: TELEGRAM_STRING_SESSION,
      apiId: parseInt(TELEGRAM_API_ID),
      apiHash: TELEGRAM_API_HASH,
    }),
    SelfieMongoModule,
    ScheduleModule.forRoot(),
  ],
  providers: [SelfieService],
})
export class SelfieModule implements OnModuleInit {
  constructor(private readonly selfieService: SelfieService) {}

  onModuleInit(): void {
    // this.selfieService.handleIntervalFlow(); // for testing purposes
  }
}
