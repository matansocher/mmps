import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { NotifierModule } from '@core/notifier';
import { TelegramBotsFactoryProvider } from '@services/telegram';
import { BOT_CONFIG } from './langly.config';
import { LanglyController } from './langly.controller';
import { LanglyService } from './langly.service';

@Module({
  imports: [NotifierModule, ScheduleModule.forRoot()],
  providers: [LanglyController, LanglyService, TelegramBotsFactoryProvider(BOT_CONFIG)],
})
export class LanglyModule {}
