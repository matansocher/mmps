import express, { type Express } from 'express';
import path from 'node:path';
import { Logger } from '@core/utils';
import { EARTH_BASE_PATH } from './constants';

const logger = new Logger('earth:init');

export async function initEarth(app: Express): Promise<void> {
  const spaDist = path.resolve('apps/earth-web/dist');
  app.use(EARTH_BASE_PATH, express.static(spaDist));
  app.get(`${EARTH_BASE_PATH}/*splat`, (_req, res) => {
    res.sendFile(path.join(spaDist, 'index.html'));
  });
  logger.log(`Earth SPA served from ${spaDist} at ${EARTH_BASE_PATH}/*`);
}
