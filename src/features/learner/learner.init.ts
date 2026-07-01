import type { Express } from 'express';
import express from 'express';
import path from 'node:path';
import { Logger } from '@core/utils';
import { provideTelegramBot } from '@services/telegram';
import { BOT_CONFIG } from './learner.config';
import { LearnerController } from './learner.controller';

const logger = new Logger('initLearner');

export async function initLearner(app: Express): Promise<void> {
  const bot = provideTelegramBot(BOT_CONFIG);

  const learnerController = new LearnerController(bot);
  learnerController.init();

  // Learner courses mini-app (React SPA). Attach the menu button in BotFather to `<publicUrl>/learner/`.
  const spaDist = path.resolve('apps/learner-web/dist');
  app.use('/learner', express.static(spaDist));
  app.get('/learner/*splat', (_req, res) => {
    res.sendFile(path.join(spaDist, 'index.html'));
  });
  logger.log(`Learner SPA served from ${spaDist} at /learner/*`);
}
