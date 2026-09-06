import { createMongoConnection } from '@core/mongo';
import { getErrorMessage, Logger } from '@core/utils';
import { provideTelegramBot } from '@services/telegram';
import { DB_NAME } from '@shared/wolt';
import { WoltSchedulerService } from './wolt-scheduler.service';
import { BOT_CONFIG } from './wolt.config';
import { WoltController } from './wolt.controller';

const logger = new Logger('wolt:init');
const INITIAL_SCHEDULE_DELAY_MS = 5000;

export async function initWolt(): Promise<void> {
  await createMongoConnection(DB_NAME);

  const bot = provideTelegramBot(BOT_CONFIG);

  const woltScheduler = new WoltSchedulerService(bot);
  const woltController = new WoltController(bot);

  woltController.init();

  setTimeout(() => {
    woltScheduler.scheduleInterval().catch((err) => logger.error(`Failed to start Wolt scheduler: ${getErrorMessage(err)}`));
  }, INITIAL_SCHEDULE_DELAY_MS);
}
