import { Module, OnModuleInit } from '@nestjs/common';
import { createMongoConnection } from '@core/mongo';
import { DB_NAME } from '@shared/coach';
import { CoachBotSchedulerService } from './coach-scheduler.service';
import { CoachController } from './coach.controller';
import { CoachService } from './coach.service';
import { CoachPredictionsService } from './predictions/coach-predictions.service';

@Module({
  providers: [CoachController, CoachBotSchedulerService, CoachService, CoachPredictionsService],
})
export class CoachModule implements OnModuleInit {
  async onModuleInit() {
    await createMongoConnection(DB_NAME);
  }
}
