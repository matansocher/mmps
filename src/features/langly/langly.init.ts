import { createMongoConnection } from '@core/mongo';
import { DB_NAME } from '@shared/langly';
import { LanglyBotSchedulerService } from './langly-scheduler.service';
import { LanglyController } from './langly.controller';
import { LanglyService } from './langly.service';

export async function initLangly(): Promise<void> {
  await createMongoConnection(DB_NAME);

  const langlyService = new LanglyService();
  const langlyController = new LanglyController(langlyService);
  const langlyScheduler = new LanglyBotSchedulerService(langlyService);

  langlyController.init();
  langlyScheduler.init();
}
