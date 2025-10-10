import { Module, OnModuleInit } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { createMongoConnection } from '@core/mongo';
import { NotifierModule } from '@core/notifier';
import { TelegramBotsFactoryProvider } from '@services/telegram';
import { DB_NAME } from '@shared/langly';
import { LanglyBotSchedulerService } from './langly-scheduler.service';
import { BOT_CONFIG } from './langly.config';
import { LanglyController } from './langly.controller';
import { LanglyService } from './langly.service';

@Module({
  imports: [NotifierModule, ScheduleModule.forRoot()],
  providers: [LanglyController, LanglyService, LanglyBotSchedulerService, TelegramBotsFactoryProvider(BOT_CONFIG)],
})
export class LanglyModule implements OnModuleInit {
  async onModuleInit() {
    await createMongoConnection(DB_NAME);
  }
}
