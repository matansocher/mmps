import axios from 'axios';
import dotenv from 'dotenv';
import express, { Request, Response } from 'express';
import { env } from 'node:process';
import { isProd } from '@core/config';
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

  app.use(express.json());

  // Tracks the components that are expected to be serving. A component is only
  // marked ready once its initialization completes without throwing, so the
  // readiness endpoint can distinguish a live process from a functioning one.
  const components = new Map<string, boolean>();
  const markReady = (name: string) => components.set(name, true);
  const markFailed = (name: string) => components.set(name, false);
  const requireComponent = (name: string) => {
    components.set(name, false);
    return {
      ready: () => markReady(name),
      failed: () => markFailed(name),
    };
  };
  const isReady = () => [...components.values()].every(Boolean);

  // Liveness: the process is up and the event loop is responsive.
  app.get('/', (_req: Request, res: Response) => {
    res.json({ success: true });
  });

  // Readiness: every required component initialized successfully. Returns 503
  // when any intended bot or app failed to start so monitoring and rollout
  // acceptance don't treat a degraded process as healthy.
  app.get('/ready', (_req: Request, res: Response) => {
    const componentStatus = Object.fromEntries(components);
    const ready = isReady();
    res.status(ready ? 200 : 503).json({ ready, components: componentStatus });
  });

  const savingsComponent = requireComponent('savings');
  try {
    await initSavings(app);
    savingsComponent.ready();
  } catch (err) {
    savingsComponent.failed();
    logger.error(`Failed to init savings app: ${getErrorMessage(err)}`);
  }

  const mindloopComponent = requireComponent('mindloop');
  try {
    await initMindloop(app);
    mindloopComponent.ready();
  } catch (err) {
    mindloopComponent.failed();
    logger.error(`Failed to init mindloop app: ${getErrorMessage(err)}`);
  }

  registerPortfolioApiRoutes(app);

  registerSwaggerRoutes(app);

  const shouldInitBot = (config: { id: string }) => isProd || env.LOCAL_ACTIVE_BOT_ID === config.id;
  const initBot = async (config: { id: string }, init: () => Promise<void>): Promise<void> => {
    if (!shouldInitBot(config)) return;
    const component = requireComponent(config.id);
    try {
      await init();
      component.ready();
    } catch (err) {
      component.failed();
      logger.error(`Failed to init bot '${config.id}': ${getErrorMessage(err)}`);
    }
  };

  await initBot(chatbotConfig, () => initChatbot(app));
  await initBot(chilliConfig, () => initChilli());
  await initBot(coachConfig, () => initCoach());
  await initBot(woltConfig, () => initWolt());
  await initBot(worldlyConfig, () => initWorldly(app));

  if (!isReady()) {
    const failed = [...components.entries()].filter(([, ready]) => !ready).map(([name]) => name);
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
