import express, { type Express, type Response } from 'express';
import path from 'node:path';
import { Logger } from '@core/utils';

const logger = new Logger('ground-zero.init');

export function initGroundZero(app: Express): void {
  const distPath = path.resolve('apps/ground-zero-web/dist');

  app.use('/ground-zero', express.static(distPath));
  app.get('/ground-zero/*splat', (_req, res: Response) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });

  logger.log(`Ground Zero SPA served from ${distPath} at /ground-zero/*`);
}
