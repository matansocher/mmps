import { createMongoConnection } from '@core/mongo';
import { provideTelegramBot } from '@services/telegram';
import { DB_NAME } from './mongo';
import { SecretaryActionService } from './secretary-action.service';
import { BOT_CONFIG } from './secretary.config';
import { SecretaryController } from './secretary.controller';
import { SecretaryDraftService } from './secretary-draft.service';
import { SecretaryNudgeService } from './secretary-nudge.service';
import { SecretarySchedulerService } from './secretary-scheduler.service';
import { SecretaryService } from './secretary.service';

export async function initSecretary(): Promise<void> {
  await createMongoConnection(DB_NAME);

  const bot = provideTelegramBot(BOT_CONFIG);

  const secretaryService = new SecretaryService();
  const secretaryActionService = new SecretaryActionService();
  const secretaryDraftService = new SecretaryDraftService(secretaryService, bot);
  const secretaryNudgeService = new SecretaryNudgeService(secretaryDraftService, bot);
  const secretaryScheduler = new SecretarySchedulerService(secretaryService, bot);
  const secretaryController = new SecretaryController(secretaryService, secretaryScheduler, secretaryActionService, secretaryDraftService, secretaryNudgeService, bot);

  secretaryController.init();
  secretaryScheduler.init();
}
