import dotenv from 'dotenv';
import express, { Request, Response } from 'express';
import { env } from 'node:process';
import { isProd } from '@core/config';
import { registerSwaggerRoutes } from '@core/openapi';
import { Logger } from '@core/utils';
import { BOT_CONFIG as chatbotConfig, initChatbot } from '@features/chatbot';
import { BOT_CONFIG as coachConfig, initCoach } from '@features/coach';
import { initLangly, BOT_CONFIG as langlyConfig } from '@features/langly';
import { initMagister, BOT_CONFIG as magisterConfig } from '@features/magister';
import { initWolt, BOT_CONFIG as woltConfig } from '@features/wolt';
import { initWorldly, BOT_CONFIG as worldlyConfig } from '@features/worldly';

dotenv.config();

async function main() {
  // await initConsoleOverride();
  const app = express();
  const port = env.PORT || 3000;
  const logger = new Logger('main.ts');

  app.use(express.json());

  app.get('/', (_req: Request, res: Response) => {
    res.json({ success: true });
  });

  registerSwaggerRoutes(app);

  const shouldInitBot = (config: { id: string }) => isProd || env.LOCAL_ACTIVE_BOT_ID === config.id;

  shouldInitBot(chatbotConfig) && (await initChatbot(app));
  shouldInitBot(coachConfig) && (await initCoach());
  shouldInitBot(langlyConfig) && (await initLangly());
  shouldInitBot(magisterConfig) && (await initMagister());
  shouldInitBot(woltConfig) && (await initWolt());
  shouldInitBot(worldlyConfig) && (await initWorldly());

  logger.log(`NODE_VERSION: ${process.versions.node}`);
  app.listen(port, () => {
    logger.log(`Server is running on http://localhost:${port}/`);
  });
}

main();
