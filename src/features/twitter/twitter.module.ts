import { Module, OnModuleInit } from '@nestjs/common';
import { createMongoConnection } from '@core/mongo';
import { DB_NAME } from '@shared/twitter';
import { TwitterSchedulerService } from './twitter-scheduler.service';
import { TwitterController } from './twitter.controller';
import { TwitterService } from './twitter.service';

@Module({
  providers: [TwitterController, TwitterSchedulerService, TwitterService],
})
export class TwitterModule implements OnModuleInit {
  async onModuleInit() {
    await createMongoConnection(DB_NAME);
  }
}
