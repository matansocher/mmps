import { configDotenv } from 'dotenv';
import express from 'express';
import { env } from 'node:process';
import { isProd } from '@core/config';
import { Logger } from '@core/utils';
import { BOT_CONFIG as chatbotBotConfig, initChatbot } from '@features/chatbot';
import { BOT_CONFIG as coachBotConfig, initCoach } from '@features/coach';
import { initLangly, BOT_CONFIG as langlyBotConfig } from '@features/langly';
import { initMagister, BOT_CONFIG as magisterBotConfig } from '@features/magister';
import { initWolt, BOT_CONFIG as woltBotConfig } from '@features/wolt';
import { initWorldly, BOT_CONFIG as worldlyBotConfig } from '@features/worldly';

configDotenv();

async function bootstrap() {
  const logger = new Logger('main.ts');
  logger.log(`NODE_VERSION: ${process.versions.node}`);

  const shouldInitBot = (config: { id: string }) => isProd || env.LOCAL_ACTIVE_BOT_ID === config.id;

  shouldInitBot(chatbotBotConfig) && (await initChatbot());
  shouldInitBot(coachBotConfig) && (await initCoach());
  shouldInitBot(langlyBotConfig) && (await initLangly());
  shouldInitBot(magisterBotConfig) && (await initMagister());
  shouldInitBot(woltBotConfig) && (await initWolt());
  shouldInitBot(worldlyBotConfig) && (await initWorldly());

  const app = express();

  app.get('/', (_req, res) => res.json({ success: true }));
  app.get('/health', (_req, res) => res.json({ success: true }));

  const port = env.PORT || 3000;
  app.listen(port, () => {
    logger.log(`MMPS service is running on port ${port}`);
  });
}

bootstrap();
