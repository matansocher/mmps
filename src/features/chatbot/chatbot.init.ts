import { createMongoConnection } from '@core/mongo';
import { DB_NAME as COACH_DB_NAME } from '@shared/coach';
import { DB_NAME as COOKER_DB_NAME } from '@shared/cooker';
import { DB_NAME as REMINDERS_DB_NAME } from '@shared/reminders';
import { DB_NAME as TRAINER_DB_NAME } from '@shared/trainer';
import { DB_NAME as WOLT_DB_NAME } from '@shared/wolt';
import { DB_NAME as WORLDLY_DB_NAME } from '@shared/worldly';
import { DB_NAME as FOLLOWER_DB_NAME } from '@shared/youtube-follower';
import { DB_NAME as POLYMARKET_DB_NAME } from '@shared/polymarket-follower';
import { ChatbotSchedulerService } from './chatbot-scheduler.service';
import { ChatbotController } from './chatbot.controller';
import { ChatbotService } from './chatbot.service';

export async function initChatbot(): Promise<void> {
  const mongoDbNames = [TRAINER_DB_NAME, COACH_DB_NAME, COOKER_DB_NAME, WOLT_DB_NAME, WORLDLY_DB_NAME, REMINDERS_DB_NAME, FOLLOWER_DB_NAME, POLYMARKET_DB_NAME];
  await Promise.all([...mongoDbNames.map(async (mongoDbName) => createMongoConnection(mongoDbName))]);

  const chatbotService = new ChatbotService();
  const chatbotController = new ChatbotController(chatbotService);
  const chatbotScheduler = new ChatbotSchedulerService(chatbotService);

  chatbotController.init();
  chatbotScheduler.init();
}
