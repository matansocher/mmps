import type { Express } from 'express';
import path from 'node:path';
import express from 'express';
import { createMongoConnection } from '@core/mongo';
import { Logger } from '@core/utils';
import { provideTelegramBot } from '@services/telegram';
import { DB_NAME, seedQuestionsIfEmpty } from '@shared/stacker';
import { registerStackerApiRoutes } from '@shared/stacker-api';
import { StackerLauncherService } from './launcher.service';
import { StackerSchedulerService } from './stacker-scheduler.service';
import { BOT_CONFIG } from './stacker.config';
import { StackerController } from './stacker.controller';

const logger = new Logger('initStacker');

export async function initStacker(app: Express): Promise<void> {
  await createMongoConnection(DB_NAME);
  await seedQuestionsIfEmpty();

  const bot = provideTelegramBot(BOT_CONFIG);
  const launcher = new StackerLauncherService(bot);
  const controller = new StackerController(launcher, bot);
  const scheduler = new StackerSchedulerService(launcher);

  controller.init();
  scheduler.init();

  registerStackerApiRoutes(app);

  // Serve Vite-built SPA at /stacker/*
  const spaDist = path.resolve('apps/stacker-web/dist');
  app.use('/stacker', express.static(spaDist));
  app.get('/stacker/*', (_req, res) => {
    res.sendFile(path.join(spaDist, 'index.html'));
  });
  logger.log(`Stacker SPA served from ${spaDist} at /stacker/*`);
}
