import { TelegramClient } from 'telegram';
import { EXCLUDED_CHANNELS, LISTEN_TO_EVENTS } from '../constants';
import { provideTelegramClient } from '../provide-telegram-client';
import { downloadVoice } from './download-voice';

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

export async function getConversationDetails(telegramClient: TelegramClient, entityId: string): Promise<ConversationDetails> {
  const channelDetails = await telegramClient.getEntity(entityId);
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

export async function listen({ conversationsIds = [] }: ListenerOptions, callback) {
  const telegramClient = await provideTelegramClient();
  telegramClient.addEventHandler(async (event) => {
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
    return callback(messageData, channelDetails);
  });
}
