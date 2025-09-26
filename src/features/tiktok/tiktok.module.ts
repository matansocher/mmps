import { Module, OnModuleInit } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { createMongoConnection } from '@core/mongo';
import { TelegramBotsFactoryProvider } from '@services/telegram';
import { DB_NAME } from '@shared/tiktok';
import { TiktokSchedulerService } from './tiktok-scheduler.service';
import { BOT_CONFIG } from './tiktok.config';
import { TiktokController } from './tiktok.controller';

@Module({
  imports: [ScheduleModule.forRoot()],
  providers: [TiktokController, TiktokSchedulerService, TelegramBotsFactoryProvider(BOT_CONFIG)],
})
export class TiktokModule implements OnModuleInit {
  async onModuleInit() {
    await createMongoConnection(DB_NAME);
  }
}
