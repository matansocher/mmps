import express, { type Express } from 'express';
import path from 'node:path';
import { Logger } from '@core/utils';

const logger = new Logger('zika:init');

export function initZika(app: Express): void {
  const spaDist = path.resolve('apps/zika-web/dist');
  app.use('/zika', express.static(spaDist));
  app.get('/zika/*splat', (_req, res) => {
    res.sendFile(path.join(spaDist, 'index.html'));
  });
  logger.log(`Zika redesign showcase served from ${spaDist} at /zika/*`);
}
