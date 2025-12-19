import dotenv from 'dotenv';
import express, { Request, Response } from 'express';
import { env } from 'node:process';
import { isProd } from '@core/config';
import { Logger } from '@core/utils';
import { BOT_CONFIG as chatbotBotConfig, initChatbot } from '@features/chatbot';
import { BOT_CONFIG as coachBotConfig, initCoach } from '@features/coach';
import { initLangly, BOT_CONFIG as langlyBotConfig } from '@features/langly';
import { initMagister, BOT_CONFIG as magisterBotConfig } from '@features/magister';
import { initWolt, BOT_CONFIG as woltBotConfig } from '@features/wolt';
import { initWorldly, BOT_CONFIG as worldlyBotConfig } from '@features/worldly';

dotenv.config();

async function main() {
  const app = express();
  const port = env.PORT || 3000;
  const logger = new Logger('main.ts');

  app.use(express.json());

  app.get('/', (_req: Request, res: Response) => {
    res.json({ success: true });
  });

  const shouldInitBot = (config: { id: string }) => isProd || env.LOCAL_ACTIVE_BOT_ID === config.id;

  shouldInitBot(chatbotBotConfig) && (await initChatbot());
  shouldInitBot(coachBotConfig) && (await initCoach());
  shouldInitBot(langlyBotConfig) && (await initLangly());
  shouldInitBot(magisterBotConfig) && (await initMagister());
  shouldInitBot(woltBotConfig) && (await initWolt());
  shouldInitBot(worldlyBotConfig) && (await initWorldly());

  logger.log(`NODE_VERSION: ${process.versions.node}`);
  app.listen(port, () => {
    logger.log(`Server is running on http://localhost:${port}/`);
  });
}

main();
