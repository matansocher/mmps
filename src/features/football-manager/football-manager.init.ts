import express, { type Express } from 'express';
import path from 'node:path';
import { createMongoConnection } from '@core/mongo';
import { Logger } from '@core/utils';
import { registerFootballManagerApiRoutes } from './api';
import { FOOTBALL_MANAGER_DB_NAME } from './constants';

const logger = new Logger('initFootballManager');

export async function initFootballManager(app: Express): Promise<void> {
  await createMongoConnection(FOOTBALL_MANAGER_DB_NAME);

  registerFootballManagerApiRoutes(app);

  // Football Manager mini-app (React SPA). Built to apps/football-manager-web/dist in Phase 1.
  const spaDist = path.resolve('apps/football-manager-web/dist');
  app.use('/football-manager', express.static(spaDist));
  app.get('/football-manager/*splat', (_req, res) => {
    res.sendFile(path.join(spaDist, 'index.html'));
  });
  logger.log(`Football Manager SPA served from ${spaDist} at /football-manager/*`);
}
