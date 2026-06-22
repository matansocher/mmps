import { Logger } from '@core/utils';
import { provideTelegramClient } from '../provide-telegram-client';
import { getConversationDetails } from './listen';
import type { ConversationDetails, SenderDetails, TelegramMessage } from './listen';

const logger = new Logger('TelegramClientPoller');

export type ChannelPollResult = {
  readonly conversation: ConversationDetails | null;
  readonly latestId: number;
  readonly items: ReadonlyArray<{ readonly message: TelegramMessage; readonly sender: SenderDetails | null }>;
};

// Broadcast channels do not deliver real-time NewMessage events to MTProto clients,
// so we poll them: fetch messages newer than the last-seen id and map them for persistence.
export async function fetchLatestMessageId(channelId: string): Promise<number | null> {
  try {
    const client = await provideTelegramClient();
    const messages = await client.getMessages(channelId, { limit: 1 });
    return messages?.[0]?.id ?? null;
  } catch (err) {
    logger.error(`Failed to fetch latest message id for ${channelId}: ${err}`);
    return null;
  }
}

export async function fetchNewChannelMessages(channelId: string, minId: number): Promise<ChannelPollResult> {
  try {
    const client = await provideTelegramClient();
    const conversation = await getConversationDetails(client, channelId);
    const messages = await client.getMessages(channelId, { minId, limit: 100 });

    let latestId = minId;
    const items: { message: TelegramMessage; sender: SenderDetails | null }[] = [];
    for (const message of messages) {
      const id = message.id;
      if (typeof id === 'number' && id > latestId) latestId = id;

      const text = message.text ?? '';
      const isVoice = (message.media as any)?.voice ?? false;
      if (!text && !isVoice) continue;

      items.push({
        message: {
          id: id.toString(),
          userId: (message.senderId ?? null)?.toString(),
          channelId,
          date: message.date ?? null,
          text,
          isVoice,
        },
        sender: null,
      });
    }

    return { conversation, latestId, items };
  } catch (err) {
    logger.error(`Failed to fetch new messages for ${channelId}: ${err}`);
    return { conversation: null, latestId: minId, items: [] };
  }
}
