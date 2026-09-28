import express, { type Express } from 'express';
import path from 'node:path';
import { createMongoConnection } from '@core/mongo';
import { Logger } from '@core/utils';
import { initializeAnalytics } from './analytics.service';
import { registerMindloopApiRoutes } from './api';
import { MINDLOOP_DB_NAME } from './constants';
import { startReminderScheduler } from './reminder.service';

const logger = new Logger('mindloop:init');

export async function initMindloop(app: Express): Promise<void> {
  await createMongoConnection(MINDLOOP_DB_NAME);
  registerMindloopApiRoutes(app);
  await initializeAnalytics().catch(() => logger.warn('Mindloop analytics indexes unavailable; gameplay remains available.'));
  startReminderScheduler();

  const spaDist = path.resolve('apps/mindloop-web/dist');
  app.use('/mindloop', express.static(spaDist));
  app.get('/mindloop/*splat', (_req, res) => {
    res.sendFile(path.join(spaDist, 'index.html'));
  });
  logger.log(`Mindloop SPA served from ${spaDist} at /mindloop/*`);
}
