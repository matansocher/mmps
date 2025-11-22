import { env } from 'node:process';
import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions';
import { Logger } from '@core/utils';

const logger = new Logger('TelegramClientProvider');
let client: TelegramClient;

export async function provideTelegramClient(): Promise<TelegramClient> {
  if (!client) {
    const apiId = +env.TELEGRAM_API_ID;
    const apiHash = env.TELEGRAM_API_HASH;
    const stringSession = env.TELEGRAM_STRING_SESSION;
    const client = new TelegramClient(new StringSession(stringSession), apiId, apiHash, { connectionRetries: 5 });
    await client.start({
      phoneNumber: null,
      password: null,
      phoneCode: null,
      onError: (err) => logger.error(`${err}`),
    });
    return client;
  }
  return client;
}
