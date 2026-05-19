import type { Express } from 'express';
import express from 'express';
import path from 'node:path';
import { createMongoConnection } from '@core/mongo';
import { Logger } from '@core/utils';
import { provideTelegramBot } from '@services/telegram';
import { DB_NAME } from '@shared/wolt';
import { registerWoltApiRoutes } from '@shared/wolt-api';
import { WoltLauncherService } from './launcher.service';
import { restaurantsService } from './restaurants.service';
import { WoltSchedulerService } from './wolt-scheduler.service';
import { ANALYTIC_EVENT_NAMES, BOT_CONFIG, MAX_NUM_OF_SUBSCRIPTIONS_PER_USER } from './wolt.config';
import { WoltController } from './wolt.controller';

const logger = new Logger('initWolt');

export async function initWolt(app: Express): Promise<void> {
  await createMongoConnection(DB_NAME);

  const bot = provideTelegramBot(BOT_CONFIG);
  const launcher = new WoltLauncherService(bot);

  const woltScheduler = new WoltSchedulerService(bot);
  const woltController = new WoltController(bot, launcher);

  woltController.init();

  setTimeout(() => {
    woltScheduler.scheduleInterval();
  }, 5000);

  registerWoltApiRoutes(app, {
    botConfig: BOT_CONFIG,
    analyticEventNames: ANALYTIC_EVENT_NAMES,
    maxSubscriptions: MAX_NUM_OF_SUBSCRIPTIONS_PER_USER,
    getRestaurants: () => restaurantsService.getRestaurants(),
  });

  const spaDist = path.resolve('apps/wolt-web/dist');
  app.use('/wolt', express.static(spaDist));
  app.get('/wolt/*splat', (_req, res) => {
    res.sendFile(path.join(spaDist, 'index.html'));
  });
  logger.log(`Wolt SPA served from ${spaDist} at /wolt/*`);
}
