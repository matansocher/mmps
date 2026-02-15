import type { Express } from 'express';
import { createMongoConnection } from '@core/mongo';
import { provideTelegramBot } from '@services/telegram';
import { DB_NAME as CALENDAR_EVENTS_DB_NAME, registerCalendarEventsRoutes } from '@shared/calendar-events';
import { DB_NAME as COACH_DB_NAME } from '@shared/coach';
import { DB_NAME as COOKER_DB_NAME } from '@shared/cooker';
import { DB_NAME as REMINDERS_DB_NAME } from '@shared/reminders';
import { DB_NAME as TRAINER_DB_NAME } from '@shared/trainer';
import { DB_NAME as WOLT_DB_NAME } from '@shared/wolt';
import { DB_NAME as WORLDLY_DB_NAME } from '@shared/worldly';
import { DB_NAME as FOLLOWER_DB_NAME } from '@shared/youtube-follower';
import { DB_NAME as POLYMARKET_DB_NAME } from '@shared/polymarket-follower';
import { DB_NAME as FLIGHTS_TRACKER_DB_NAME } from '@shared/flights-tracker';
import { ChatbotSchedulerService } from './chatbot-scheduler.service';
import { BOT_CONFIG } from './chatbot.config';
import { ChatbotController } from './chatbot.controller';
import { ChatbotService } from './chatbot.service';

export async function initChatbot(app: Express): Promise<void> {
  const mongoDbNames = [TRAINER_DB_NAME, COACH_DB_NAME, COOKER_DB_NAME, WOLT_DB_NAME, WORLDLY_DB_NAME, REMINDERS_DB_NAME, FOLLOWER_DB_NAME, POLYMARKET_DB_NAME, CALENDAR_EVENTS_DB_NAME, FLIGHTS_TRACKER_DB_NAME];
  await Promise.all([...mongoDbNames.map(async (mongoDbName) => createMongoConnection(mongoDbName))]);

  const bot = provideTelegramBot(BOT_CONFIG);

  const chatbotService = new ChatbotService();
  const chatbotController = new ChatbotController(chatbotService, bot);
  const chatbotScheduler = new ChatbotSchedulerService(chatbotService, bot);

  chatbotController.init();
  chatbotScheduler.init();
  registerCalendarEventsRoutes(app);
}
