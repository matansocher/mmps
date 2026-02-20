import { env } from 'node:process';
import { TelegramClient } from 'telegram';
import { LogLevel } from 'telegram/extensions/Logger';
import { StringSession } from 'telegram/sessions';
import { Logger } from '@core/utils';

const logger = new Logger('TelegramClientProvider');
const HEALTH_CHECK_INTERVAL_MS = 5 * 60 * 1000;

let client: TelegramClient;
let healthCheckTimer: ReturnType<typeof setInterval>;

export async function provideTelegramClient(): Promise<TelegramClient> {
  if (!client) {
    const apiId = +env.TELEGRAM_API_ID;
    const apiHash = env.TELEGRAM_API_HASH;
    const stringSession = env.TELEGRAM_STRING_SESSION;
    client = new TelegramClient(new StringSession(stringSession), apiId, apiHash, {
      connectionRetries: 5,
      autoReconnect: true,
      floodSleepThreshold: 120,
      retryDelay: 2000,
    });
    client.setLogLevel(LogLevel.ERROR);
    await client.start({
      phoneNumber: null,
      password: null,
      phoneCode: null,
      onError: (err) => logger.error(`${err}`),
    });
    await client.connect();
    logger.log('Telegram client connected');
    startHealthCheck();
  }
  return client;
}

export async function disconnectTelegramClient(): Promise<void> {
  if (healthCheckTimer) {
    clearInterval(healthCheckTimer);
  }
  if (client) {
    await client.disconnect();
    logger.log('Telegram client disconnected');
  }
}

function startHealthCheck(): void {
  healthCheckTimer = setInterval(async () => {
    try {
      await client.getMe();
      logger.log('Health check passed');
    } catch (err) {
      logger.error(`Health check failed: ${err}`);
    }
  }, HEALTH_CHECK_INTERVAL_MS);
}

process.on('SIGTERM', async () => {
  await disconnectTelegramClient();
});

process.on('SIGINT', async () => {
  await disconnectTelegramClient();
});
