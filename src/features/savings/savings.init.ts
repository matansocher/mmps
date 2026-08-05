import express, { type Express } from 'express';
import path from 'node:path';
import { createMongoConnection } from '@core/mongo';
import { Logger } from '@core/utils';
import { registerSavingsApiRoutes } from './api';
import { SAVINGS_DB_NAME } from './constants';

const logger = new Logger('initSavings');

export async function initSavings(app: Express): Promise<void> {
  await createMongoConnection(SAVINGS_DB_NAME);
  registerSavingsApiRoutes(app);

  const spaDist = path.resolve('apps/savings-web/dist');
  app.use('/savings', express.static(spaDist));
  app.get('/savings/*splat', (_req, res) => {
    res.sendFile(path.join(spaDist, 'index.html'));
  });
  logger.log(`Savings SPA served from ${spaDist} at /savings/*`);
}
