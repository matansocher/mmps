import { provideTelegramBot } from '@services/telegram';
import { BOT_CONFIG } from './chilli.config';
import { ChilliController } from './chilli.controller';
import { ChilliService } from './chilli.service';

export async function initChilli(): Promise<void> {
  const bot = provideTelegramBot(BOT_CONFIG);

  const chilliService = new ChilliService();
  const chilliController = new ChilliController(chilliService, bot);

  chilliController.init();
}
