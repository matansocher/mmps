import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TelegramBotsFactoryProvider } from '@services/telegram';
import { LanglyBotSchedulerService } from './langly-scheduler.service';
import { BOT_CONFIG } from './langly.config';
import { LanglyController } from './langly.controller';
import { LanglyService } from './langly.service';

@Module({
  imports: [ScheduleModule.forRoot()],
  providers: [LanglyController, LanglyService, LanglyBotSchedulerService, TelegramBotsFactoryProvider(BOT_CONFIG)],
})
export class LanglyModule {}
