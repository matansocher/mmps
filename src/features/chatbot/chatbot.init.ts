import type { Express } from 'express';
import express from 'express';
import path from 'node:path';
import { createMongoConnection } from '@core/mongo';
import { Logger } from '@core/utils';
import { initOctokit } from '@services/github/utils';
import { provideTelegramBot } from '@services/telegram';
import { ensureUsageIndexes, USAGE_DB_NAME } from '@shared/ai';
import { DB_NAME as CALENDAR_EVENTS_DB_NAME, registerCalendarEventsRoutes } from '@shared/calendar-events';
import { DB_NAME as COACH_DB_NAME } from '@shared/coach';
import { DB_NAME as COOKER_DB_NAME } from '@shared/cooker';
import { ensureExpenseIndexes, ensureIngestExpenseIndexes, DB_NAME as EXPENSES_DB_NAME } from '@shared/expenses';
import { DB_NAME as FRIENDS_DB_NAME } from '@shared/friends';
import { DB_NAME as MEET_FRIENDS_DB_NAME } from '@shared/meet-friends';
import { DB_NAME as POLYMARKET_DB_NAME } from '@shared/polymarket-follower';
import { DB_NAME as REMINDERS_DB_NAME } from '@shared/reminders';
import { DB_NAME as SELFIE_DB_NAME } from '@shared/selfie';
import { DB_NAME as TRAINER_DB_NAME } from '@shared/trainer';
import { DB_NAME as WOLT_DB_NAME } from '@shared/wolt';
import { DB_NAME as WORLDLY_DB_NAME } from '@shared/worldly';
import { DB_NAME as FOLLOWER_DB_NAME } from '@shared/youtube-follower';
import { createChatbotCheckpointer } from './agent';
import { registerChatbotApiRoutes } from './api';
import { ChatbotSchedulerService } from './chatbot-scheduler.service';
import { BOT_CONFIG } from './chatbot.config';
import { ChatbotController } from './chatbot.controller';
import { ChatbotService } from './chatbot.service';
import { ChatbotLauncherService } from './launcher.service';

const logger = new Logger('initChatbot');

export async function initChatbot(app: Express): Promise<void> {
  const mongoDbNames = [
    TRAINER_DB_NAME,
    COACH_DB_NAME,
    COOKER_DB_NAME,
    WOLT_DB_NAME,
    WORLDLY_DB_NAME,
    REMINDERS_DB_NAME,
    FOLLOWER_DB_NAME,
    POLYMARKET_DB_NAME,
    CALENDAR_EVENTS_DB_NAME,
    SELFIE_DB_NAME,
    FRIENDS_DB_NAME,
    MEET_FRIENDS_DB_NAME,
    EXPENSES_DB_NAME,
    USAGE_DB_NAME,
  ];
  await Promise.all([...mongoDbNames.map(async (mongoDbName) => createMongoConnection(mongoDbName))]);

  await ensureExpenseIndexes();
  await ensureIngestExpenseIndexes();
  await ensureUsageIndexes();

  // Build the checkpointer BEFORE provideTelegramBot(), which calls bot.start().
  // grammY locks the bot against new listeners once polling begins, so any `await`
  // between starting the bot and registering handlers lets polling win the race and
  // makes controller.init()'s bot.command/bot.on calls throw. Keep this await above.
  const checkpointer = await createChatbotCheckpointer();

  const bot = provideTelegramBot(BOT_CONFIG);

  const chatbotService = new ChatbotService(checkpointer);
  const launcher = new ChatbotLauncherService(bot);
  const chatbotController = new ChatbotController(chatbotService, bot, launcher);
  const chatbotScheduler = new ChatbotSchedulerService(chatbotService, bot);

  chatbotController.init();
  chatbotScheduler.init();
  registerCalendarEventsRoutes(app);
  registerChatbotApiRoutes(app);

  initOctokit();

  const spaDist = path.resolve('apps/chatbot-web/dist');
  app.use('/chatbot', express.static(spaDist));
  app.get('/chatbot/*splat', (_req, res) => {
    res.sendFile(path.join(spaDist, 'index.html'));
  });
  logger.log(`Chatbot SPA served from ${spaDist} at /chatbot/*`);
}
