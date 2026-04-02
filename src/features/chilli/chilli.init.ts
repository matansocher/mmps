import { createMongoConnection } from '@core/mongo';
import { provideTelegramBot } from '@services/telegram';
import { BOT_CONFIG } from './chilli.config';
import { ChilliController } from './chilli.controller';
import { ChilliService } from './chilli.service';
import { DB_NAME } from './mongo';

export async function initChilli(): Promise<void> {
  await createMongoConnection(DB_NAME);

  const bot = provideTelegramBot(BOT_CONFIG);

  const chilliService = new ChilliService();
  const chilliController = new ChilliController(chilliService, bot);

  chilliController.init();
}
