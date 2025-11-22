import { configDotenv } from 'dotenv';
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

  if (shouldInitBot(chatbotBotConfig)) {
    await initChatbot();
  }

  if (shouldInitBot(coachBotConfig)) {
    await initCoach();
  }

  if (shouldInitBot(langlyBotConfig)) {
    await initLangly();
  }

  if (shouldInitBot(magisterBotConfig)) {
    await initMagister();
  }

  if (shouldInitBot(woltBotConfig)) {
    await initWolt();
  }

  if (shouldInitBot(worldlyBotConfig)) {
    await initWorldly();
  }

  logger.log('MMPS service is running');
}

bootstrap();
