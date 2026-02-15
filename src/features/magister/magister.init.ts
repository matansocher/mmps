import { createMongoConnection } from '@core/mongo';
import { provideTelegramBot } from '@services/telegram';
import { MagisterSchedulerService } from './magister-scheduler.service';
import { BOT_CONFIG } from './magister.config';
import { MagisterController } from './magister.controller';
import { MagisterService } from './magister.service';
import { DB_NAME } from './mongo';

export async function initMagister(): Promise<void> {
  await createMongoConnection(DB_NAME);

  const bot = provideTelegramBot(BOT_CONFIG);

  const magisterService = new MagisterService(bot);
  const magisterController = new MagisterController(magisterService, bot);
  const magisterScheduler = new MagisterSchedulerService(magisterService);

  magisterController.init();
  magisterScheduler.init();
}
