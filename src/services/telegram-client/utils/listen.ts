import { TelegramClient } from 'telegram';
import { Logger } from '@core/utils';
import { EXCLUDED_CHANNELS, LISTEN_TO_EVENTS } from '../constants';
import { provideTelegramClient } from '../provide-telegram-client';
import { downloadVoice } from './download-voice';

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

export async function getMessageData(client: TelegramClient, event): Promise<TelegramMessage> {
  const data: TelegramMessage = {
    id: event?.message?.id ?? event?.id ?? null,
    userId: event?.message?.fromId?.userId ?? event?.userId ?? event?.message?.peerId?.userId ?? null,
    channelId: (event?.message?.peerId?.channelId ?? '').toString(),
    date: event?.message?.date ?? event?.date ?? null,
    text: event?.message?.message ?? event?.message ?? null,
    isVoice: event?.message?.media?.voice ?? false,
  };
  if (data.isVoice) {
    data.voice = await downloadVoice(client, event);
  }
  return data;
}

export async function getConversationDetails(telegramClient: TelegramClient, entityId: string): Promise<ConversationDetails | null> {
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
      if (!LISTEN_TO_EVENTS.includes(event.className)) {
        return;
      }
      const messageData = await getMessageData(telegramClient, event);
      if (!messageData?.text && !messageData?.voice) {
        return;
      }

      const channelId = messageData?.channelId?.toString();
      const userId = messageData?.userId?.toString();
      if (conversationsIds.length && !conversationsIds.includes(channelId) && !conversationsIds.includes(userId)) {
        return;
      }
      const entityId = messageData.channelId ? `-100${messageData.channelId}` : messageData.userId.toString();
      const channelDetails = await getConversationDetails(telegramClient, entityId);
      if (!channelDetails?.id || EXCLUDED_CHANNELS.some((excludedChannel) => channelDetails.id.includes(excludedChannel))) {
        return;
      }
      const senderDetails = messageData.userId ? await getSenderDetails(telegramClient, messageData.userId) : null;
      await callback(messageData, channelDetails, senderDetails);
    } catch (err) {
      logger.error(`Error handling telegram event: ${err}`);
    }
  });
}
