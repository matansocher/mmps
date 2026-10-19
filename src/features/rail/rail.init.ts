import { createMongoConnection } from '@core/mongo';
import { provideTelegramBot } from '@services/telegram';
import { DB_NAME } from './mongo';
import { BOT_CONFIG } from './rail.config';
import { RailController } from './rail.controller';
import { RailService } from './rail.service';

export async function initRail(): Promise<void> {
  await createMongoConnection(DB_NAME);
  const bot = provideTelegramBot(BOT_CONFIG);

  const railService = new RailService();
  const railController = new RailController(railService, bot);

  railController.init();
}
