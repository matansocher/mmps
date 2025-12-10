import { createMongoConnection } from '@core/mongo';
import { Logger } from '@core/utils';
import { connectGithubMcp } from '@shared/ai';
import { DB_NAME as COACH_DB_NAME } from '@shared/coach';
import { DB_NAME as COOKER_DB_NAME } from '@shared/cooker';
import { DB_NAME as REMINDERS_DB_NAME } from '@shared/reminders';
import { DB_NAME as TRAINER_DB_NAME } from '@shared/trainer';
import { DB_NAME as WOLT_DB_NAME } from '@shared/wolt';
import { DB_NAME as WORLDLY_DB_NAME } from '@shared/worldly';
import { ChatbotSchedulerService } from './chatbot-scheduler.service';
import { ChatbotController } from './chatbot.controller';
import { ChatbotService } from './chatbot.service';

const logger = new Logger('chatbot.init');

export async function initChatbot(): Promise<void> {
  const mongoDbNames = [TRAINER_DB_NAME, COACH_DB_NAME, COOKER_DB_NAME, WOLT_DB_NAME, WORLDLY_DB_NAME, REMINDERS_DB_NAME];
  await Promise.all([
    ...mongoDbNames.map(async (mongoDbName) => createMongoConnection(mongoDbName)),
    connectGithubMcp().catch((err) => {
      logger.error(`[ChatbotModule] Failed to connect to GitHub MCP: ${err}`);
    }),
  ]);

  const chatbotService = new ChatbotService();
  const chatbotController = new ChatbotController(chatbotService);
  const chatbotScheduler = new ChatbotSchedulerService(chatbotService);

  chatbotController.init();
  chatbotScheduler.init();
}
