import type { Express } from 'express';
import express from 'express';
import path from 'node:path';
import { createMongoConnection } from '@core/mongo';
import { Logger } from '@core/utils';
import { provideTelegramBot } from '@services/telegram';
import { DB_NAME } from '@shared/worldly';
import { registerWorldlyApiRoutes } from './api';
import { WorldlyLauncherService } from './launcher.service';
import { WorldlyBotSchedulerService } from './worldly-scheduler.service';
import { BOT_CONFIG } from './worldly.config';
import { WorldlyController } from './worldly.controller';
import { WorldlyService } from './worldly.service';

const logger = new Logger('initWorldly');

export async function initWorldly(app: Express): Promise<void> {
  await createMongoConnection(DB_NAME);

  const bot = provideTelegramBot(BOT_CONFIG);

  const worldlyService = new WorldlyService(bot);
  const launcher = new WorldlyLauncherService(bot);
  const worldlyController = new WorldlyController(worldlyService, bot, launcher);
  const worldlyScheduler = new WorldlyBotSchedulerService(worldlyService);

  worldlyController.init();
  worldlyScheduler.init();

  registerWorldlyApiRoutes(app, { botConfig: BOT_CONFIG });

  const spaDist = path.resolve('apps/worldly-web/dist');
  app.use('/worldly', express.static(spaDist));
  app.get('/worldly/*splat', (_req, res) => {
    res.sendFile(path.join(spaDist, 'index.html'));
  });
  logger.log(`Worldly SPA served from ${spaDist} at /worldly/*`);
}
