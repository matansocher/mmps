import { createMongoConnection } from '@core/mongo';
import { DB_NAME } from '@shared/wolt';
import { WoltSchedulerService } from './wolt-scheduler.service';
import { WoltController } from './wolt.controller';

export async function initWolt(): Promise<void> {
  await createMongoConnection(DB_NAME);

  const woltScheduler = new WoltSchedulerService();
  const woltController = new WoltController();

  woltController.init();

  setTimeout(() => {
    woltScheduler.scheduleInterval();
  }, 5000);
}
