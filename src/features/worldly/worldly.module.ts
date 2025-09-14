import { Module, OnModuleInit } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { createMongoConnection } from '@core/mongo';
import { NotifierModule } from '@core/notifier';
import { TelegramBotsFactoryProvider } from '@services/telegram';
import { DB_NAME } from './mongo';
import { WorldlyBotSchedulerService } from './worldly-scheduler.service';
import { BOT_CONFIG } from './worldly.config';
import { WorldlyController } from './worldly.controller';
import { WorldlyService } from './worldly.service';

@Module({
  imports: [ScheduleModule.forRoot(), NotifierModule],
  providers: [WorldlyController, WorldlyService, WorldlyBotSchedulerService, TelegramBotsFactoryProvider(BOT_CONFIG)],
})
export class WorldlyModule implements OnModuleInit {
  async onModuleInit() {
    await createMongoConnection(DB_NAME);
  }
}
