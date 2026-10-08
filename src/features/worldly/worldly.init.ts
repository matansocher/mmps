import express, { type Express } from 'express';
import path from 'node:path';
import { createMongoConnection } from '@core/mongo';
import { getErrorMessage, Logger } from '@core/utils';
import { provideTelegramBot } from '@services/telegram';
import { DB_NAME } from '@shared/worldly';
import { WorldlyBotSchedulerService } from './worldly-scheduler.service';
import { BOT_CONFIG, GLOBE_APP_PATH, GLOBE_APP_URL, GLOBE_BUTTON_TEXT } from './worldly.config';
import { WorldlyController } from './worldly.controller';
import { WorldlyService } from './worldly.service';

const logger = new Logger('worldly:init');

export async function initWorldly(app: Express): Promise<void> {
  await createMongoConnection(DB_NAME);

  const bot = provideTelegramBot(BOT_CONFIG);

  const worldlyService = new WorldlyService(bot);
  const worldlyController = new WorldlyController(worldlyService, bot);
  const worldlyScheduler = new WorldlyBotSchedulerService(worldlyService);

  worldlyController.init();
  worldlyScheduler.init();

  // Telegram only accepts https mini-app urls, so a local http base url is skipped.
  if (GLOBE_APP_URL.startsWith('https://')) {
    bot.api
      .setChatMenuButton({ menu_button: { type: 'web_app', text: GLOBE_BUTTON_TEXT, web_app: { url: GLOBE_APP_URL } } })
      .catch((err) => logger.error(`Failed to set menu button: ${getErrorMessage(err)}`));
  }

  const spaDist = path.resolve('apps/earth-web/dist');
  app.use(GLOBE_APP_PATH, express.static(spaDist));
  app.get(`${GLOBE_APP_PATH}/*splat`, (_req, res) => {
    res.sendFile(path.join(spaDist, 'index.html'));
  });
  logger.log(`Globe SPA served from ${spaDist} at ${GLOBE_APP_PATH}/*`);
}
