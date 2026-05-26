import type { Express } from 'express';
import express from 'express';
import { dirname } from 'node:path';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createMongoConnection } from '@core/mongo';
import { DB_NAME } from '@shared/world-cup';
import { registerWorldCupApiRoutes } from '@shared/world-cup-api';
import { WorldCupSchedulerService } from './world-cup-scheduler.service';
import { BOT_CONFIG } from './world-cup.config';
import { WorldCupController } from './world-cup.controller';
import { WorldCupService } from './world-cup.service';

export async function initWorldCup(app: Express): Promise<void> {
  await createMongoConnection(DB_NAME);

  const worldCupService = new WorldCupService();
  const worldCupController = new WorldCupController(worldCupService);
  const worldCupScheduler = new WorldCupSchedulerService(worldCupService);

  worldCupController.init();
  worldCupScheduler.init();

  registerWorldCupApiRoutes(app, { botConfig: BOT_CONFIG });

  // Serve mini-app static files
  const spaPath = path.join(dirname(fileURLToPath(import.meta.url)), '../../../apps/world-cup-web/dist');
  app.use('/world-cup', express.static(spaPath));
  app.get('/world-cup/{*path}', (_req, res) => res.sendFile(path.join(spaPath, 'index.html')));
}
