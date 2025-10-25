import { Module, OnModuleInit } from '@nestjs/common';
import { createMongoConnection } from '@core/mongo';
import { EducatorSchedulerService } from './educator-scheduler.service';
import { EducatorController } from './educator.controller';
import { EducatorService } from './educator.service';
import { DB_NAME } from './mongo';

@Module({
  providers: [EducatorController, EducatorSchedulerService, EducatorService],
})
export class EducatorModule implements OnModuleInit {
  async onModuleInit() {
    await createMongoConnection(DB_NAME);
  }
}
