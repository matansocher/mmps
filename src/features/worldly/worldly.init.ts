import { createMongoConnection } from '@core/mongo';
import { DB_NAME } from '@shared/worldly';
import { WorldlyBotSchedulerService } from './worldly-scheduler.service';
import { WorldlyController } from './worldly.controller';
import { WorldlyService } from './worldly.service';

export async function initWorldly(): Promise<void> {
  await createMongoConnection(DB_NAME);

  const worldlyService = new WorldlyService();
  const worldlyController = new WorldlyController(worldlyService);
  const worldlyScheduler = new WorldlyBotSchedulerService(worldlyService);

  worldlyController.init();
  worldlyScheduler.init();
}
