import { env } from 'node:process';
import { createMongoConnection, hasMongoConnection } from '@core/mongo';
import { Logger } from '@core/utils';
import { CHANNELS, listen } from '@services/telegram-client';
import { DB_NAME as SELFIE_DB_NAME, saveEvent } from '@shared/selfie';

const logger = new Logger('SecretaryMonitor');

// Listens to incoming Telegram messages (private chats and groups) via the user-mode client
// and persists them. Errors are fully contained so a telegram client failure never stops the server.
export async function startGroupMonitor(): Promise<void> {
  try {
    if (!env.TELEGRAM_API_ID || !env.TELEGRAM_API_HASH || !env.TELEGRAM_STRING_SESSION) {
      logger.warn('Skipping group monitor: TELEGRAM_API_ID / TELEGRAM_API_HASH / TELEGRAM_STRING_SESSION not set.');
      return;
    }

    // Filter which conversations to capture by passing their ids here (private chats and groups).
    const conversationsIds = Object.values(CHANNELS).map((channel) => channel.id);
    if (conversationsIds.length === 0) {
      logger.warn('Skipping group monitor: no channels configured in CHANNELS.');
      return;
    }

    if (!hasMongoConnection(SELFIE_DB_NAME)) {
      await createMongoConnection(SELFIE_DB_NAME);
    }

    await listen({ conversationsIds }, async (message, conversation, sender) => {
      try {
        await saveEvent(message, conversation, sender);
      } catch (err) {
        logger.error(`Failed to save monitored message: ${err}`);
      }
    });
    logger.log(`Group monitor listening to ${conversationsIds.length} conversations.`);
  } catch (err) {
    logger.error(`Group monitor failed to start (server continues): ${err}`);
  }
}
