import { createMongoConnection } from '@core/mongo';
import { getErrorMessage, Logger } from '@core/utils';
import { warmLightRailTimetable } from '@services/light-rail';
import { provideTelegramBot } from '@services/telegram';
import { DB_NAME, ensureWakeAlertIndexes } from './mongo';
import { RailSchedulerService } from './rail-scheduler.service';
import { RailWakeService } from './rail-wake.service';
import { BOT_CONFIG } from './rail.config';
import { RailController } from './rail.controller';
import { RailService } from './rail.service';

const logger = new Logger('rail:init');

export async function initRail(): Promise<void> {
  await createMongoConnection(DB_NAME);
  await ensureWakeAlertIndexes().catch((err) => logger.error(`Failed to create wake alert indexes: ${getErrorMessage(err)}`));
  const bot = provideTelegramBot(BOT_CONFIG);

  const railService = new RailService();
  const railWakeService = new RailWakeService(bot);
  const railController = new RailController(railService, railWakeService, bot);
  const railScheduler = new RailSchedulerService(railWakeService);

  railController.init();
  railScheduler.init();
  warmLightRailTimetable();
}
