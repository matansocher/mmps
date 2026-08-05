import axios from 'axios';
import dotenv from 'dotenv';
import express, { Request, Response } from 'express';
import { env } from 'node:process';
import { isProd } from '@core/config';
import { closeMongoConnections } from '@core/mongo';
import { registerSwaggerRoutes } from '@core/openapi';
import { closeRedisConnection } from '@core/services';
import { gracefulShutdown, Logger } from '@core/utils';
import { BOT_CONFIG as chatbotConfig, initChatbot } from '@features/chatbot';
import { BOT_CONFIG as chilliConfig, initChilli } from '@features/chilli';
import { BOT_CONFIG as coachConfig, initCoach } from '@features/coach';
import { BOT_CONFIG as expensesConfig, initExpenses } from '@features/expenses';
import { initLearner, BOT_CONFIG as learnerConfig } from '@features/learner';
import { initSavings } from '@features/savings';
import { initWolt, BOT_CONFIG as woltConfig } from '@features/wolt';
import { initWorldly, BOT_CONFIG as worldlyConfig } from '@features/worldly';
import { stopAllTelegramBots } from '@services/telegram';

dotenv.config();

axios.defaults.timeout = 30_000; // bound all outbound HTTP calls

async function main() {
  // await initConsoleOverride();
  const app = express();
  const port = env.PORT || 3000;
  const logger = new Logger('index');

  app.use(express.json());

  app.get('/', (_req: Request, res: Response) => {
    res.json({ success: true });
  });

  try {
    await initSavings(app);
  } catch (err) {
    logger.error(`Failed to init savings app: ${err instanceof Error ? err.message : String(err)}`);
  }

  registerSwaggerRoutes(app);

  const shouldInitBot = (config: { id: string }) => isProd || env.LOCAL_ACTIVE_BOT_ID === config.id;
  const initBot = async (config: { id: string }, init: () => Promise<void>): Promise<void> => {
    if (!shouldInitBot(config)) return;
    try {
      await init();
    } catch (err) {
      logger.error(`Failed to init bot '${config.id}': ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  await initBot(chatbotConfig, () => initChatbot(app));
  await initBot(chilliConfig, () => initChilli());
  await initBot(coachConfig, () => initCoach(app));
  await initBot(expensesConfig, () => initExpenses(app));
  await initBot(learnerConfig, () => initLearner(app));
  await initBot(woltConfig, () => initWolt());
  await initBot(worldlyConfig, () => initWorldly(app));

  logger.log(`NODE_VERSION: ${process.versions.node}`);
  const server = app.listen(port, () => {
    logger.log(`Server is running on http://localhost:${port}/`);
  });

  const closeHttpServer = () => new Promise<void>((resolve) => server.close(() => resolve()));
  gracefulShutdown(closeHttpServer, stopAllTelegramBots, closeMongoConnections, closeRedisConnection);
}

main().catch((err) => {
  new Logger('index').error(`Fatal error during startup: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
