import { TelegramClient } from 'telegram';
import type { EntityLike } from 'telegram/define';
import { NewMessage, type NewMessageEvent } from 'telegram/events';
import { Logger } from '@core/utils';
import { EXCLUDED_CHANNELS } from '../constants';
import { provideTelegramClient } from '../provide-telegram-client';

const logger = new Logger('TelegramClientListener');

type ListenerOptions = {
  readonly conversationsIds?: string[];
};

export type TelegramMessage = {
  readonly id: string;
  readonly userId: string;
  readonly channelId: string;
  readonly date: number;
  readonly text: string;
  readonly isVoice: boolean;
  voice?: {
    readonly fileName: string;
  };
};

export type ConversationDetails = {
  readonly id: string;
  readonly createdDate: number;
  readonly title: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly userName: string;
  readonly photo?: string;
};

export type SenderDetails = {
  readonly id: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly userName: string;
};

function extractMessageData(event: NewMessageEvent): TelegramMessage {
  const message = event.message;
  let peerId = '';
  if (message.peerId) {
    if ('channelId' in message.peerId) {
      peerId = message.peerId.channelId.toString();
    } else if ('chatId' in message.peerId) {
      peerId = message.peerId.chatId.toString();
    } else if ('userId' in message.peerId) {
      peerId = message.peerId.userId.toString();
    }
  }

  return {
    id: (message.id ?? null).toString(),
    userId: (message.senderId ?? null)?.toString(),
    channelId: peerId,
    date: message.date ?? null,
    text: message.text ?? null,
    isVoice: (message.media as any)?.voice ?? false,
  };
}

export async function getConversationDetails(telegramClient: TelegramClient, entityId: EntityLike): Promise<ConversationDetails | null> {
  const entity = await telegramClient.getEntity(entityId).catch((err) => {
    logger.error(`Failed to get conversation details for entity ${entityId}: ${err}`);
    return null;
  });
  return {
    id: (entity?.id ?? null).toString(),
    createdDate: entity?.date ?? null,
    title: entity?.title ?? null,
    firstName: entity?.firstName ?? null,
    lastName: entity?.lastName ?? null,
    userName: entity?.username ?? null,
    photo: null,
  };
}

async function getSenderDetails(telegramClient: TelegramClient, userId: string): Promise<SenderDetails | null> {
  const user = await telegramClient.getEntity(userId).catch((err) => {
    logger.error(`Failed to get sender details for user ${userId}: ${err}`);
    return null;
  });
  if (!user) return null;
  return {
    id: (user.id ?? null).toString(),
    firstName: user.firstName ?? null,
    lastName: user.lastName ?? null,
    userName: user.username ?? null,
  };
}

type ListenCallback = (message: TelegramMessage, details: ConversationDetails, sender: SenderDetails | null) => void | Promise<void>;

export async function listen({ conversationsIds = [] }: ListenerOptions, callback: ListenCallback) {
  const telegramClient = await provideTelegramClient();

  await telegramClient.getDialogs({});
  logger.log('Loaded dialogs into entity cache');

  telegramClient.addEventHandler(async (event: NewMessageEvent) => {
    try {
      const messageData = extractMessageData(event);
      if (!messageData?.text && !messageData?.voice) {
        return;
      }

      const channelId = messageData.channelId;
      const userId = messageData.userId;
      if (conversationsIds.length && !conversationsIds.includes(channelId) && !conversationsIds.includes(userId)) {
        return;
      }

      const chat = await event.message.getChat();
      const entityId = chat ?? event.message.peerId ?? userId;
      if (!entityId) {
        logger.warn('No entityId found in message');
        return;
      }
      const chatAny = chat as any;
      const channelDetails = chat
        ? { id: chat.id.toString(), createdDate: chatAny.date ?? null, title: chatAny.title ?? null, firstName: chatAny.firstName ?? null, lastName: chatAny.lastName ?? null, userName: chatAny.username ?? null, photo: null }
        : await getConversationDetails(telegramClient, entityId);
      if (!channelDetails?.id || channelDetails.id === 'null') {
        logger.warn(`No conversation details found for channelId: ${channelId}, userId: ${userId}`);
        return;
      }
      if (EXCLUDED_CHANNELS.some((excludedChannel) => channelDetails.id.includes(excludedChannel))) {
        return;
      }
      const senderDetails = userId ? await getSenderDetails(telegramClient, userId) : null;
      await callback(messageData, channelDetails, senderDetails);
    } catch (err) {
      logger.error(`Error handling telegram event: ${err}`);
    }
  }, new NewMessage({ incoming: false }));
}
