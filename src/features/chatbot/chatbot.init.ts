import type { Express } from 'express';
import { createMongoConnection } from '@core/mongo';
import { initOctokit } from '@services/github/utils';
import { provideTelegramBot } from '@services/telegram';
import { ensureUsageIndexes, USAGE_DB_NAME } from '@shared/ai';
import { registerCalendarEventsRoutes } from '@shared/calendar-events';
import { DB_NAME as COACH_DB_NAME } from '@shared/coach';
import { ensureReminderIndexes } from '@shared/reminders';
import { ensureDigestDeliveryIndexes, ensurePendingPostIndexes } from '@shared/social-follower';
import { ensureTransferTrackerIndexes } from '@shared/transfer-tracker';
import { DB_NAME as WOLT_DB_NAME } from '@shared/wolt';
import { DB_NAME as WORLDLY_DB_NAME } from '@shared/worldly';
import { createChatbotCheckpointer } from './agent';
import { ChatbotSchedulerService } from './chatbot-scheduler.service';
import { BOT_CONFIG } from './chatbot.config';
import { ChatbotController } from './chatbot.controller';
import { ChatbotService } from './chatbot.service';
import { ensureSecretaryMessageIndexes, SecretaryActionService, SecretaryMessageService } from './secretary';

export async function initChatbot(app: Express): Promise<void> {
  const mongoDbNames = [
    COACH_DB_NAME,
    WOLT_DB_NAME,
    WORLDLY_DB_NAME,
    USAGE_DB_NAME,
  ];
  await Promise.all([...mongoDbNames.map(async (mongoDbName) => createMongoConnection(mongoDbName))]);

  await ensureUsageIndexes();
  await ensureReminderIndexes();
  await ensureSecretaryMessageIndexes();
  await ensureTransferTrackerIndexes();
  await ensurePendingPostIndexes();
  await ensureDigestDeliveryIndexes();

  // Build the checkpointer BEFORE provideTelegramBot(), which calls bot.start().
  // grammY locks the bot against new listeners once polling begins, so any `await`
  // between starting the bot and registering handlers lets polling win the race and
  // makes controller.init()'s bot.command/bot.on calls throw. Keep this await above.
  const checkpointer = await createChatbotCheckpointer();

  const bot = provideTelegramBot(BOT_CONFIG);

  const chatbotService = new ChatbotService(checkpointer);
  const secretaryMessageService = new SecretaryMessageService();
  const secretaryActionService = new SecretaryActionService();
  const chatbotController = new ChatbotController(chatbotService, bot, secretaryMessageService, secretaryActionService);
  const chatbotScheduler = new ChatbotSchedulerService(chatbotService, bot, secretaryMessageService);

  chatbotController.init();
  chatbotScheduler.init();
  registerCalendarEventsRoutes(app);

  initOctokit();
}
