import cors from 'cors';
import dotenv from 'dotenv';
import express, { Request, Response } from 'express';
import { env } from 'node:process';
import { isProd } from '@core/config';
import { closeMongoConnections, createMongoConnection } from '@core/mongo';
import { registerSwaggerRoutes } from '@core/openapi';
import { gracefulShutdown, Logger } from '@core/utils';
import { BOT_CONFIG as chatbotConfig, initChatbot } from '@features/chatbot';
import { BOT_CONFIG as chilliConfig, initChilli } from '@features/chilli';
import { BOT_CONFIG as coachConfig, initCoach } from '@features/coach';
import { initWolt, BOT_CONFIG as woltConfig } from '@features/wolt';
import { initWorldly, BOT_CONFIG as worldlyConfig } from '@features/worldly';
import { stopAllTelegramBots } from '@services/telegram';
import { DB_NAME as AUTH_DB_NAME, registerAuthRoutes } from '@shared/auth';

dotenv.config();

async function main() {
  // await initConsoleOverride();
  const app = express();
  const port = env.PORT || 3000;
  const logger = new Logger('main.ts');

  app.use(express.json());

  // CORS for auth endpoints (companion extension)
  const companionOrigin = env.COMPANION_ORIGIN;
  if (companionOrigin) {
    app.use('/api/auth', cors({ origin: companionOrigin, credentials: true }));
  }

  app.get('/', (_req: Request, res: Response) => {
    res.json({ success: true });
  });

  registerSwaggerRoutes(app);

  // Auth routes — always active, not gated by bot init
  await createMongoConnection(AUTH_DB_NAME);
  registerAuthRoutes(app);

  const shouldInitBot = (config: { id: string }) => isProd || env.LOCAL_ACTIVE_BOT_ID === config.id;

  shouldInitBot(chatbotConfig) && (await initChatbot(app));
  shouldInitBot(chilliConfig) && (await initChilli());
  shouldInitBot(coachConfig) && (await initCoach(app));
  shouldInitBot(woltConfig) && (await initWolt(app));
  shouldInitBot(worldlyConfig) && (await initWorldly(app));

  logger.log(`NODE_VERSION: ${process.versions.node}`);
  app.listen(port, () => {
    logger.log(`Server is running on http://localhost:${port}/`);
  });

  gracefulShutdown(stopAllTelegramBots, closeMongoConnections);
}

main();
