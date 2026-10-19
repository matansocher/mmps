import { provideTelegramBot } from '@services/telegram';
import { BOT_CONFIG } from './rail.config';
import { RailController } from './rail.controller';
import { RailService } from './rail.service';

export async function initRail(): Promise<void> {
  const bot = provideTelegramBot(BOT_CONFIG);

  const railService = new RailService();
  const railController = new RailController(railService, bot);

  railController.init();
}
