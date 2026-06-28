import { createMongoConnection } from '@core/mongo';
import { provideTelegramBot } from '@services/telegram';
import { DB_NAME } from '@shared/wolt';
import { WoltSchedulerService } from './wolt-scheduler.service';
import { BOT_CONFIG } from './wolt.config';
import { WoltController } from './wolt.controller';

export async function initWolt(): Promise<void> {
  await createMongoConnection(DB_NAME);

  const bot = provideTelegramBot(BOT_CONFIG);

  const woltScheduler = new WoltSchedulerService(bot);
  const woltController = new WoltController(bot);

  woltController.init();

  setTimeout(() => {
    woltScheduler.scheduleInterval();
  }, 5000);
}
