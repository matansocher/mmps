import { Module, OnModuleInit } from '@nestjs/common';
import { createMongoConnection } from '@core/mongo';
import { NotifierModule } from '@core/notifier';
import { TelegramBotsFactoryProvider } from '@services/telegram';
import { EducatorSchedulerService } from './educator-scheduler.service';
import { BOT_CONFIG } from './educator.config';
import { EducatorController } from './educator.controller';
import { EducatorService } from './educator.service';
import { DB_NAME } from './mongo';

@Module({
  imports: [NotifierModule],
  providers: [EducatorController, EducatorSchedulerService, EducatorService, TelegramBotsFactoryProvider(BOT_CONFIG)],
})
export class EducatorModule implements OnModuleInit {
  async onModuleInit() {
    await createMongoConnection(DB_NAME);
  }
}
