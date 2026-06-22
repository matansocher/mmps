import bigInt from 'big-integer';
import { Api, type TelegramClient } from 'telegram';
import type { EntityLike } from 'telegram/define';
import { Logger } from '@core/utils';
import { provideTelegramClient } from '../provide-telegram-client';
import { getConversationDetails } from './listen';
import type { ConversationDetails, SenderDetails, TelegramMessage } from './listen';

const logger = new Logger('TelegramClientPoller');

// Broadcast channel ids come in as raw positive ids (e.g. "1406113886"). gramJS would otherwise
// treat a bare positive id as a PeerUser, so we wrap it in a PeerChannel and resolve its access hash
// from the entity cache (warming it via getDialogs on the first miss).
async function resolveChannelEntity(client: TelegramClient, channelId: string): Promise<EntityLike> {
  const peer = new Api.PeerChannel({ channelId: bigInt(channelId) });
  try {
    return await client.getInputEntity(peer);
  } catch {
    await client.getDialogs({});
    return await client.getInputEntity(peer);
  }
}

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
    const entity = await resolveChannelEntity(client, channelId);
    const messages = await client.getMessages(entity, { limit: 1 });
    return messages?.[0]?.id ?? null;
  } catch (err) {
    logger.error(`Failed to fetch latest message id for ${channelId}: ${err}`);
    return null;
  }
}

export async function fetchNewChannelMessages(channelId: string, minId: number): Promise<ChannelPollResult> {
  try {
    const client = await provideTelegramClient();
    const entity = await resolveChannelEntity(client, channelId);
    const conversation = await getConversationDetails(client, entity);
    const messages = await client.getMessages(entity, { minId, limit: 100 });

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
