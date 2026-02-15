import { createMongoConnection } from '@core/mongo';
import { provideTelegramBot } from '@services/telegram';
import { DB_NAME } from '@shared/coach';
import { CoachBotSchedulerService } from './coach-scheduler.service';
import { BOT_CONFIG } from './coach.config';
import { CoachController } from './coach.controller';
import { CoachService } from './coach.service';

export async function initCoach(): Promise<void> {
  await createMongoConnection(DB_NAME);

  const bot = provideTelegramBot(BOT_CONFIG);

  const coachService = new CoachService();
  const coachController = new CoachController(coachService, bot);
  const coachScheduler = new CoachBotSchedulerService(coachService, bot);

  coachController.init();
  coachScheduler.init();
}
