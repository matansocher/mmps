import express, { type Express } from 'express';
import path from 'node:path';
import { Logger } from '@core/utils';
import { registerRewindApiRoutes } from './api';

const logger = new Logger('rewind:init');

export function initRewind(app: Express): void {
  registerRewindApiRoutes(app);
  const spaDist = path.resolve('apps/rewind-web/dist');
  app.use('/rewind', express.static(spaDist));
  app.get('/rewind/*splat', (_req, res) => {
    res.sendFile(path.join(spaDist, 'index.html'));
  });
  logger.log(`Rewind puzzle game served from ${spaDist} at /rewind/*`);
}
