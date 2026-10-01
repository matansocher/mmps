import express, { type Express } from 'express';
import path from 'node:path';
import { createMongoConnection } from '@core/mongo';
import { Logger } from '@core/utils';
import { hellsKitchenAuth } from './api/auth';
import { registerHellsKitchenApiRoutes } from './api/hells-kitchen.api.controller';
import { HELLS_KITCHEN_DB_NAME } from './constants';

export function serveHellsKitchen(app: Express): void {
  const dist = path.resolve('apps/hells-kitchen-web/dist');
  app.use('/hells-kitchen', (req, res, next) => {
    let pathname: string;
    try {
      pathname = path.posix.normalize(decodeURIComponent(req.path));
    } catch {
      res.sendStatus(400);
      return;
    }
    if (pathname === '/game-assets' || pathname.startsWith('/game-assets/')) {
      res.setHeader('Cache-Control', 'private, no-store');
      hellsKitchenAuth(req, res, next);
      return;
    }
    next();
  });
  app.use('/hells-kitchen', express.static(dist));
  app.get('/hells-kitchen/*splat', (req, res) => {
    if (path.extname(req.path)) {
      res.sendStatus(404);
      return;
    }
    res.sendFile(path.join(dist, 'index.html'));
  });
}
export async function initHellsKitchen(app: Express): Promise<void> {
  await createMongoConnection(HELLS_KITCHEN_DB_NAME);
  registerHellsKitchenApiRoutes(app);
  serveHellsKitchen(app);
  new Logger('hells-kitchen:init').log('Hell’s Kitchen served at /hells-kitchen/');
}
