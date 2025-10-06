import { Module, OnModuleInit } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { createMongoConnection } from '@core/mongo';
import { TelegramBotsFactoryProvider } from '@services/telegram';
import { DB_NAME } from './mongo';
import { ScholarSchedulerService } from './scholar-scheduler.service';
import { BOT_CONFIG } from './scholar.config';
import { ScholarController } from './scholar.controller';
import { ScholarService } from './scholar.service';

@Module({
  imports: [ScheduleModule.forRoot()],
  providers: [ScholarController, ScholarSchedulerService, ScholarService, TelegramBotsFactoryProvider(BOT_CONFIG)],
})
export class ScholarModule implements OnModuleInit {
  async onModuleInit() {
    await createMongoConnection(DB_NAME);
  }
}
