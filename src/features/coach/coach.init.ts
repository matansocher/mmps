import type { Express } from 'express';
import express from 'express';
import path from 'node:path';
import { createMongoConnection } from '@core/mongo';
import { Logger } from '@core/utils';
import { provideTelegramBot } from '@services/telegram';
import { DB_NAME } from '@shared/coach';
import { registerCoachApiRoutes } from '@shared/coach-api';
import { CoachBotSchedulerService } from './coach-scheduler.service';
import { BOT_CONFIG } from './coach.config';
import { CoachController } from './coach.controller';
import { CoachService } from './coach.service';
import { CoachLauncherService } from './launcher.service';

const logger = new Logger('initCoach');

export async function initCoach(app: Express): Promise<void> {
  await createMongoConnection(DB_NAME);

  const bot = provideTelegramBot(BOT_CONFIG);
  const coachService = new CoachService();
  const launcher = new CoachLauncherService(bot);
  const coachController = new CoachController(coachService, bot, launcher);
  const coachScheduler = new CoachBotSchedulerService(coachService, bot);

  coachController.init();
  coachScheduler.init();

  registerCoachApiRoutes(app);

  const spaDist = path.resolve('apps/coach-web/dist');
  app.use('/coach', express.static(spaDist));
  app.get('/coach/*splat', (_req, res) => {
    res.sendFile(path.join(spaDist, 'index.html'));
  });
  logger.log(`Coach SPA served from ${spaDist} at /coach/*`);
}
