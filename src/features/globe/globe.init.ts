import express, { type Express } from 'express';
import path from 'node:path';
import { Logger } from '@core/utils';

const logger = new Logger('initGlobe');

export async function initGlobe(app: Express): Promise<void> {
  const spaDist = path.resolve('apps/globe-web/dist');
  app.use('/globe', express.static(spaDist));
  app.get('/globe/*splat', (_req, res) => {
    res.sendFile(path.join(spaDist, 'index.html'));
  });
  logger.log(`Globe SPA served from ${spaDist} at /globe/*`);
}
