import { createMongoConnection } from '@core/mongo';
import { DB_NAME } from '@shared/coach';
import { CoachBotSchedulerService } from './coach-scheduler.service';
import { CoachController } from './coach.controller';
import { CoachService } from './coach.service';
import { CoachPredictionsService } from './predictions/coach-predictions.service';

export async function initCoach(): Promise<void> {
  await createMongoConnection(DB_NAME);

  const coachPredictionsService = new CoachPredictionsService();
  const coachService = new CoachService(coachPredictionsService);
  const coachController = new CoachController(coachService);
  const coachScheduler = new CoachBotSchedulerService(coachService);

  coachController.init();
  coachScheduler.init();
}
