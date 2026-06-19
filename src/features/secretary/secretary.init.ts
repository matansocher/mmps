import { provideTelegramBot } from '@services/telegram';
import { BOT_CONFIG } from './secretary.config';
import { SecretaryController } from './secretary.controller';
import { SecretaryService } from './secretary.service';

export async function initSecretary(): Promise<void> {
  const bot = provideTelegramBot(BOT_CONFIG);

  const secretaryService = new SecretaryService();
  const secretaryController = new SecretaryController(secretaryService, bot);

  secretaryController.init();
}
