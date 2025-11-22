import { createMongoConnection } from '@core/mongo';
import { MagisterSchedulerService } from './magister-scheduler.service';
import { MagisterController } from './magister.controller';
import { MagisterService } from './magister.service';
import { DB_NAME } from './mongo';

export async function initMagister(): Promise<void> {
  await createMongoConnection(DB_NAME);

  const magisterService = new MagisterService();
  const magisterController = new MagisterController(magisterService);
  const magisterScheduler = new MagisterSchedulerService(magisterService);

  magisterController.init();
  magisterScheduler.init();
}
