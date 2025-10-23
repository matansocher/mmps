import { Module, OnModuleInit } from '@nestjs/common';
import { createMongoConnection } from '@core/mongo';
import { NotifierService } from '@core/notifier';
import { TelegramBotsFactoryProvider } from '@services/telegram';
import { DB_NAME } from '@shared/twitter';
import { TwitterSchedulerService } from './twitter-scheduler.service';
import { BOT_CONFIG } from './twitter.config';
import { TwitterController } from './twitter.controller';
import { TwitterService } from './twitter.service';

@Module({
  providers: [TwitterController, TwitterSchedulerService, TwitterService, NotifierService, TelegramBotsFactoryProvider(BOT_CONFIG)],
})
export class TwitterModule implements OnModuleInit {
  async onModuleInit() {
    await createMongoConnection(DB_NAME);
  }
}
