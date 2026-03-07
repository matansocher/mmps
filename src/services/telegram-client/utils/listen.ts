import { TelegramClient } from 'telegram';
import type { EntityLike } from 'telegram/define';
import { Logger } from '@core/utils';
import { EXCLUDED_CHANNELS, EXCLUDED_EVENTS, LISTEN_TO_EVENTS } from '../constants';
import { provideTelegramClient } from '../provide-telegram-client';

const logger = new Logger('TelegramClientListener');

type ListenerOptions = {
  readonly conversationsIds?: string[];
};

type TelegramMessage = {
  readonly id: string;
  readonly userId: string;
  readonly channelId: string;
  readonly date: number;
  readonly text: string;
};

type ConversationDetails = {
  readonly id: string;
  readonly createdDate: number;
  readonly title: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly userName: string;
  readonly photo?: string;
};

type SenderDetails = {
  readonly id: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly userName: string;
};

function getMessageData(event): TelegramMessage {
  return {
    id: event?.message?.id ?? event?.id ?? null,
    userId: event?.message?.fromId?.userId ?? event?.userId ?? event?.message?.peerId?.userId ?? null,
    channelId: (event?.message?.peerId?.channelId ?? '').toString(),
    date: event?.message?.date ?? event?.date ?? null,
    text: event?.message?.message ?? event?.message ?? null,
  };
}

async function getConversationDetails(telegramClient: TelegramClient, entityId: EntityLike): Promise<ConversationDetails | null> {
  const channelDetails = await telegramClient.getEntity(entityId).catch((err) => {
    logger.error(`Failed to get conversation details for entity ${entityId}: ${err}`);
    return null;
  });
  return {
    id: (channelDetails?.id ?? null).toString(),
    createdDate: channelDetails?.date ?? null,
    title: channelDetails?.title ?? null,
    firstName: channelDetails?.firstName ?? null,
    lastName: channelDetails?.lastName ?? null,
    userName: channelDetails?.username ?? null,
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
  telegramClient.addEventHandler(async (event) => {
    try {
      if (EXCLUDED_EVENTS.includes(event?.className)) {
        return;
      }
      if (event.className) {
        console.log(`Received event of type ${event.className}`);
      } else {
        console.warn('Received event without className, skipping, event:', event);
      }
      if (!LISTEN_TO_EVENTS.includes(event.className)) {
        return;
      }
      const messageData = getMessageData(event);

      const channelId = messageData?.channelId?.toString();
      const userId = messageData?.userId?.toString();
      if (conversationsIds.length && !conversationsIds.includes(channelId) && !conversationsIds.includes(userId)) {
        return;
      }
      const peerId = event?.message?.peerId;
      const entityId = peerId ?? messageData.userId?.toString();
      if (!entityId) {
        logger.warn('No peerId or userId found in messageData');
        return;
      }
      const channelDetails = await getConversationDetails(telegramClient, entityId);
      if (!channelDetails?.id) {
        logger.warn(`No conversation details found for entityId: ${entityId}, channelId: ${messageData.channelId}, userId: ${messageData.userId}`);
        return;
      }
      if (EXCLUDED_CHANNELS.some((excludedChannel) => channelDetails.id.includes(excludedChannel))) {
        return;
      }
      const senderDetails = messageData.userId ? await getSenderDetails(telegramClient, messageData.userId) : null;
      await callback(messageData, channelDetails, senderDetails);
    } catch (err) {
      logger.error(`Error handling telegram event: ${err}`);
    }
  });
}
