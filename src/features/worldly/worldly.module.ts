import { Module, OnModuleInit } from '@nestjs/common';
import { createMongoConnection } from '@core/mongo';
import { NotifierModule } from '@core/notifier';
import { DB_NAME } from '@shared/worldly';
import { WorldlyBotSchedulerService } from './worldly-scheduler.service';
import { WorldlyController } from './worldly.controller';
import { WorldlyService } from './worldly.service';

@Module({
  imports: [NotifierModule],
  providers: [WorldlyController, WorldlyService, WorldlyBotSchedulerService],
})
export class WorldlyModule implements OnModuleInit {
  async onModuleInit() {
    await createMongoConnection(DB_NAME);
  }
}
