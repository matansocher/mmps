import { Module, OnModuleInit } from '@nestjs/common';
import { createMongoConnection } from '@core/mongo';
import { TelegramBotsFactoryProvider } from '@services/telegram';
import { CookerService } from './cooker';
import { DB_NAME } from './cooker/mongo';
import { BOT_CONFIG } from './notifier.config';
import { NotifierController } from './notifier.controller';
import { NotifierService } from './notifier.service';

@Module({
  providers: [NotifierController, NotifierService, CookerService, TelegramBotsFactoryProvider(BOT_CONFIG)],
  exports: [NotifierService],
})
export class NotifierModule implements OnModuleInit {
  async onModuleInit() {
    await createMongoConnection(DB_NAME);
  }
}
