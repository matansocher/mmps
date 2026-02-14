import { createMongoConnection } from '@core/mongo';
import { provideTelegramBot } from '@services/telegram';
import { DB_NAME } from '@shared/langly';
import { BOT_CONFIG } from './langly.config';
import { LanglyBotSchedulerService } from './langly-scheduler.service';
import { LanglyController } from './langly.controller';
import { LanglyService } from './langly.service';

export async function initLangly(): Promise<void> {
  await createMongoConnection(DB_NAME);

  const bot = provideTelegramBot(BOT_CONFIG);

  const langlyService = new LanglyService(bot);
  const langlyController = new LanglyController(langlyService, bot);
  const langlyScheduler = new LanglyBotSchedulerService(langlyService);

  langlyController.init();
  langlyScheduler.init();
}
