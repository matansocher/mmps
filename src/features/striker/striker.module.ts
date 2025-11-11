import { Module, OnModuleInit } from '@nestjs/common';
import { createMongoConnection } from '@core/mongo';
import { DB_NAME } from '@shared/striker';
import { StrikerSchedulerService } from './striker-scheduler.service';
import { StrikerController } from './striker.controller';

@Module({
  providers: [StrikerController, StrikerSchedulerService],
})
export class StrikerModule implements OnModuleInit {
  async onModuleInit() {
    await createMongoConnection(DB_NAME);
  }
}
