import { Module, OnModuleInit } from '@nestjs/common';
import { createMongoConnection } from '@core/mongo';
import { DB_NAME } from '@shared/langly';
import { LanglyBotSchedulerService } from './langly-scheduler.service';
import { LanglyController } from './langly.controller';
import { LanglyService } from './langly.service';

@Module({
  providers: [LanglyController, LanglyService, LanglyBotSchedulerService],
})
export class LanglyModule implements OnModuleInit {
  async onModuleInit() {
    await createMongoConnection(DB_NAME);
  }
}
