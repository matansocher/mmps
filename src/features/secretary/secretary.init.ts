import { createMongoConnection } from '@core/mongo';
import { provideTelegramBot } from '@services/telegram';
import { DB_NAME } from './mongo';
import { BOT_CONFIG } from './secretary.config';
import { SecretaryController } from './secretary.controller';
import { startChannelPoller, startGroupMonitor } from './secretary-monitor';
import { SecretarySchedulerService } from './secretary-scheduler.service';
import { SecretarySelfieService } from './secretary-selfie.service';
import { SecretaryService } from './secretary.service';

export async function initSecretary(): Promise<void> {
  await createMongoConnection(DB_NAME);

  const bot = provideTelegramBot(BOT_CONFIG);

  const secretaryService = new SecretaryService();
  const secretarySelfieService = new SecretarySelfieService();
  const secretaryScheduler = new SecretarySchedulerService(secretaryService, secretarySelfieService, bot);
  const secretaryController = new SecretaryController(secretaryService, secretaryScheduler, bot);

  secretaryController.init();
  secretaryScheduler.init();

  // Fire-and-forget so a slow/failed telegram client connection never blocks bot startup.
  void startGroupMonitor();
  void startChannelPoller();
}
