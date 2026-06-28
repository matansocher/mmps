import type { Express } from 'express';
import { createMongoConnection } from '@core/mongo';
import { provideTelegramBot } from '@services/telegram';
import { DB_NAME } from '@shared/worldly';
import { WorldlyBotSchedulerService } from './worldly-scheduler.service';
import { BOT_CONFIG } from './worldly.config';
import { WorldlyController } from './worldly.controller';
import { WorldlyService } from './worldly.service';

export async function initWorldly(_app: Express): Promise<void> {
  await createMongoConnection(DB_NAME);

  const bot = provideTelegramBot(BOT_CONFIG);

  const worldlyService = new WorldlyService(bot);
  const worldlyController = new WorldlyController(worldlyService, bot);
  const worldlyScheduler = new WorldlyBotSchedulerService(worldlyService);

  worldlyController.init();
  worldlyScheduler.init();
}
