import { createMongoConnection } from '@core/mongo';
import { provideTelegramBot } from '@services/telegram';
import { DB_NAME } from './mongo';
import { BOT_CONFIG } from './secretary.config';
import { SecretaryController } from './secretary.controller';
import { SecretarySchedulerService } from './secretary-scheduler.service';
import { SecretaryService } from './secretary.service';

export async function initSecretary(): Promise<void> {
  await createMongoConnection(DB_NAME);

  const bot = provideTelegramBot(BOT_CONFIG);

  const secretaryService = new SecretaryService();
  const secretaryScheduler = new SecretarySchedulerService(secretaryService, bot);
  const secretaryController = new SecretaryController(secretaryService, secretaryScheduler, bot);

  secretaryController.init();
  secretaryScheduler.init();
}
