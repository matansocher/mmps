import { Module, OnModuleInit } from '@nestjs/common';
import { createMongoConnection } from '@core/mongo';
import { MagisterSchedulerService } from './magister-scheduler.service';
import { MagisterController } from './magister.controller';
import { MagisterService } from './magister.service';
import { DB_NAME } from './mongo';

@Module({
  providers: [MagisterController, MagisterSchedulerService, MagisterService],
})
export class MagisterModule implements OnModuleInit {
  async onModuleInit() {
    await createMongoConnection(DB_NAME);
  }
}
