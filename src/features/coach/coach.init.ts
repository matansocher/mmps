import { createMongoConnection } from '@core/mongo';
import { DB_NAME } from '@shared/coach';
import { CoachBotSchedulerService } from './coach-scheduler.service';
import { CoachController } from './coach.controller';
import { CoachService } from './coach.service';

export async function initCoach(): Promise<void> {
  await createMongoConnection(DB_NAME);

  const coachService = new CoachService();
  const coachController = new CoachController(coachService);
  const coachScheduler = new CoachBotSchedulerService(coachService);

  coachController.init();
  coachScheduler.init();
}
