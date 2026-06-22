import { env } from 'node:process';
import cron from 'node-cron';
import { DEFAULT_TIMEZONE } from '@core/config';
import { createMongoConnection, hasMongoConnection } from '@core/mongo';
import { Logger } from '@core/utils';
import { CHANNELS, fetchLatestMessageId, fetchNewChannelMessages, listen } from '@services/telegram-client';
import { DB_NAME as SELFIE_DB_NAME, getChannelCursor, saveEvent, setChannelCursor } from '@shared/selfie';

const logger = new Logger('SecretaryMonitor');

// Broadcast channels don't push real-time NewMessage events to MTProto clients, so they are polled.
const CHANNEL_POLL_CRON = '*/15 * * * *';

function hasClientCredentials(): boolean {
  return Boolean(env.TELEGRAM_API_ID && env.TELEGRAM_API_HASH && env.TELEGRAM_STRING_SESSION);
}

async function ensureSelfieConnection(): Promise<void> {
  if (!hasMongoConnection(SELFIE_DB_NAME)) {
    await createMongoConnection(SELFIE_DB_NAME);
  }
}

// Listens to ALL incoming Telegram messages (private chats and groups) via the user-mode client
// and persists them. Errors are fully contained so a telegram client failure never stops the server.
export async function startGroupMonitor(): Promise<void> {
  try {
    if (!hasClientCredentials()) {
      logger.warn('Skipping group monitor: TELEGRAM_API_ID / TELEGRAM_API_HASH / TELEGRAM_STRING_SESSION not set.');
      return;
    }

    await ensureSelfieConnection();

    // No conversationsIds filter: capture incoming messages from every chat and group.
    await listen({}, async (message, conversation, sender) => {
      try {
        await saveEvent(message, conversation, sender);
      } catch (err) {
        logger.error(`Failed to save monitored message: ${err}`);
      }
    });
    logger.log('Group monitor listening to all conversations.');
  } catch (err) {
    logger.error(`Group monitor failed to start (server continues): ${err}`);
  }
}

// Polls broadcast channels for new posts and persists them, tracking a per-channel cursor in Mongo.
export async function startChannelPoller(): Promise<void> {
  try {
    if (!hasClientCredentials()) {
      logger.warn('Skipping channel poller: telegram client credentials not set.');
      return;
    }

    const channelIds = Object.values(CHANNELS)
      .filter((channel) => channel.type === 'channel')
      .map((channel) => channel.id);
    if (channelIds.length === 0) {
      logger.warn('Skipping channel poller: no broadcast channels configured in CHANNELS.');
      return;
    }

    await ensureSelfieConnection();

    // Bootstrap cursors to the latest post so we never backfill the entire channel history on first run.
    await pollChannels(channelIds);

    cron.schedule(CHANNEL_POLL_CRON, () => void pollChannels(channelIds), { timezone: DEFAULT_TIMEZONE });
    logger.log(`Channel poller scheduled for ${channelIds.length} channels (${CHANNEL_POLL_CRON}).`);
  } catch (err) {
    logger.error(`Channel poller failed to start (server continues): ${err}`);
  }
}

async function pollChannels(channelIds: readonly string[]): Promise<void> {
  for (const channelId of channelIds) {
    try {
      const lastSeen = await getChannelCursor(channelId);

      if (lastSeen === null) {
        const latestId = await fetchLatestMessageId(channelId);
        if (latestId !== null) await setChannelCursor(channelId, latestId);
        continue;
      }

      const { conversation, latestId, items } = await fetchNewChannelMessages(channelId, lastSeen);
      if (conversation) {
        for (const { message, sender } of items) {
          await saveEvent(message, conversation, sender);
        }
      }
      if (latestId > lastSeen) await setChannelCursor(channelId, latestId);
    } catch (err) {
      logger.error(`Failed to poll channel ${channelId}: ${err}`);
    }
  }
}
