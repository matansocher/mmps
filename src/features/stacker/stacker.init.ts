import { createMongoConnection } from '@core/mongo';
import { provideTelegramBot } from '@services/telegram';
import { DB_NAME } from '@shared/stacker';
import { seedQuestionsIfEmpty } from './seed-questions';
import { StackerSchedulerService } from './stacker-scheduler.service';
import { BOT_CONFIG } from './stacker.config';
import { StackerController } from './stacker.controller';
import { StackerService } from './stacker.service';

export async function initStacker(): Promise<void> {
  await createMongoConnection(DB_NAME);
  await seedQuestionsIfEmpty();

  const bot = provideTelegramBot(BOT_CONFIG);
  const stackerService = new StackerService(bot);
  const stackerController = new StackerController(stackerService, bot);
  const stackerScheduler = new StackerSchedulerService(stackerService);

  stackerController.init();
  stackerScheduler.init();
}
