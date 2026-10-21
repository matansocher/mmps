import express, { type Express } from 'express';
import path from 'node:path';
import { Logger } from '@core/utils';

const logger = new Logger('claims:init');

export function initClaims(app: Express): void {
  const spaDist = path.resolve('apps/claims-web/dist');
  app.use('/claims', express.static(spaDist));
  app.get('/claims/*splat', (_req, res) => {
    res.sendFile(path.join(spaDist, 'index.html'));
  });
  logger.log(`Claims landing concepts served from ${spaDist} at /claims/*`);
}
