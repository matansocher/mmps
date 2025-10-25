import { Module, OnModuleInit } from '@nestjs/common';
import { createMongoConnection } from '@core/mongo';
import { DB_NAME } from '@shared/wolt';
import { WoltSchedulerService } from './wolt-scheduler.service';
import { WoltController } from './wolt.controller';

@Module({
  providers: [WoltController, WoltSchedulerService],
})
export class WoltModule implements OnModuleInit {
  constructor(private readonly woltSchedulerService: WoltSchedulerService) {}

  async onModuleInit() {
    await createMongoConnection(DB_NAME);
    setTimeout(() => {
      this.woltSchedulerService.scheduleInterval();
    }, 5000);
  }
}
