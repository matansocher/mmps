import express, { type Express } from 'express';
import path from 'node:path';
import { createMongoConnection } from '@core/mongo';
import { Logger } from '@core/utils';
import { provideTelegramBot } from '@services/telegram';
import { registerLearnerApiRoutes } from './api';
import { LEARNER_DB_NAME } from './constants';
import { ensureLearnerDeliveryIndexes } from './mongo';
import { BOT_CONFIG } from './learner.config';
import { LearnerController } from './learner.controller';
import { LearnerSchedulerService } from './learner-scheduler.service';

const logger = new Logger('learner:init');

export async function initLearner(app: Express): Promise<void> {
  await createMongoConnection(LEARNER_DB_NAME);
  await ensureLearnerDeliveryIndexes().catch((err) => logger.error(`Failed to ensure indexes: ${err}`));

  const bot = provideTelegramBot(BOT_CONFIG);
  const controller = new LearnerController(bot);
  const scheduler = new LearnerSchedulerService();
  controller.init();
  scheduler.init();

  registerLearnerApiRoutes(app);

  const spaDist = path.resolve('apps/learner-web/dist');
  app.use('/learner', express.static(spaDist));
  app.get('/learner/*splat', (_req, res) => {
    res.sendFile(path.join(spaDist, 'index.html'));
  });
  logger.log(`Learner SPA served from ${spaDist} at /learner/*`);
}
