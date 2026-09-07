import axios from 'axios';
import dotenv from 'dotenv';
import express, { Request, Response } from 'express';
import { env } from 'node:process';
import { isProd } from '@core/config';
import { getReadinessReport, markComponentFailed, markComponentReady } from '@core/health';
import { closeMongoConnections } from '@core/mongo';
import { registerSwaggerRoutes } from '@core/openapi';
import { closeRedisConnection } from '@core/services';
import { getErrorMessage, gracefulShutdown, Logger } from '@core/utils';
import { BOT_CONFIG as chatbotConfig, initChatbot } from '@features/chatbot';
import { BOT_CONFIG as chilliConfig, initChilli } from '@features/chilli';
import { BOT_CONFIG as coachConfig, initCoach } from '@features/coach';
import { registerPortfolioApiRoutes } from '@features/portfolio';
import { initMindloop } from '@features/mindloop';
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
  const logger = new Logger('bootstrap');

  // Behind the platform's single reverse proxy (Procfile web dyno): trust one
  // hop so req.ip reflects the real client for rate limiting, without trusting
  // arbitrary client-supplied X-Forwarded-For headers.
  app.set('trust proxy', 1);

  app.use(express.json());

  // Liveness: the process is up and the event loop is responsive. This must not
  // depend on downstream components, so orchestrators don't kill a live process
  // just because an optional dependency is degraded.
  app.get('/', (_req: Request, res: Response) => {
    res.json({ success: true });
  });

  // Readiness: the process can actually serve. Returns 503 when any required
  // component (bot, savings, mindloop, ...) failed to initialize or stopped
  // serving, so monitoring and rollout acceptance can distinguish a live process
  // from a functioning application.
  app.get('/health/ready', (_req: Request, res: Response) => {
    const report = getReadinessReport();
    res.status(report.ready ? 200 : 503).json(report);
  });

  try {
    await initSavings(app);
    markComponentReady('savings');
  } catch (err) {
    markComponentFailed('savings', getErrorMessage(err));
    logger.error(`Failed to init savings app: ${getErrorMessage(err)}`);
  }

  try {
    await initMindloop(app);
    markComponentReady('mindloop');
  } catch (err) {
    markComponentFailed('mindloop', getErrorMessage(err));
    logger.error(`Failed to init mindloop app: ${getErrorMessage(err)}`);
  }

  registerPortfolioApiRoutes(app);

  registerSwaggerRoutes(app);

  const shouldInitBot = (config: { id: string }) => isProd || env.LOCAL_ACTIVE_BOT_ID === config.id;
  const initBot = async (config: { id: string }, init: () => Promise<void>): Promise<void> => {
    if (!shouldInitBot(config)) return;
    try {
      await init();
      markComponentReady(config.id);
    } catch (err) {
      markComponentFailed(config.id, getErrorMessage(err));
      logger.error(`Failed to init bot '${config.id}': ${getErrorMessage(err)}`);
    }
  };

  await initBot(chatbotConfig, () => initChatbot(app));
  await initBot(chilliConfig, () => initChilli());
  await initBot(coachConfig, () => initCoach());
  await initBot(woltConfig, () => initWolt());
  await initBot(worldlyConfig, () => initWorldly(app));

  const { ready, components } = getReadinessReport();
  if (!ready) {
    const failed = components.filter((component) => component.status === 'failed').map((component) => component.name);
    logger.error(`Startup completed with unavailable components: ${failed.join(', ')}`);
  }

  logger.log(`NODE_VERSION: ${process.versions.node}`);
  const server = app.listen(port, () => {
    logger.log(`Server is running on http://localhost:${port}/`);
  });

  const closeHttpServer = () => new Promise<void>((resolve) => server.close(() => resolve()));
  gracefulShutdown(closeHttpServer, stopAllTelegramBots, closeMongoConnections, closeRedisConnection);
}

main().catch((err) => {
  new Logger('bootstrap').error(`Fatal error during startup: ${getErrorMessage(err)}`);
  process.exit(1);
});
