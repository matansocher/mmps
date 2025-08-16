import { get as _get } from 'lodash';
import { TelegramClient } from 'telegram';
import { EXCLUDED_CHANNELS, LISTEN_TO_EVENTS } from '../constants';
import { provideTelegramClient } from '../provide-telegram-client';
import { downloadVoice } from './download-voice';

type ListenerOptions = {
  readonly conversationsIds?: string[];
};

export interface TelegramMessage {
  readonly id: string;
  readonly userId: string;
  readonly channelId: string;
  readonly date: number;
  readonly text: string;
  readonly isVoice: boolean;
  voice?: {
    readonly fileName: string;
  };
}

export interface ConversationDetails {
  readonly id: string;
  readonly createdDate: number;
  readonly title: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly userName: string;
  readonly photo?: string;
}

export async function getMessageData(client: TelegramClient, event): Promise<TelegramMessage> {
  const data: TelegramMessage = {
    id: _get(event, 'message.id', _get(event, 'id', null)),
    userId: _get(event, 'message.fromId.userId', _get(event, 'userId', _get(event, 'message.peerId.userId', null))),
    channelId: _get(event, 'message.peerId.channelId', '').toString(),
    date: _get(event, 'message.date', _get(event, 'date', null)),
    text: _get(event, 'message.message', _get(event, 'message', null)),
    isVoice: _get(event, 'message.media.voice', false),
  };
  if (data.isVoice) {
    data.voice = await downloadVoice(client, event);
  }
  return data;
}

export async function getConversationDetails(telegramClient: TelegramClient, entityId: string): Promise<ConversationDetails> {
  const channelDetails = await telegramClient.getEntity(entityId);
  return {
    id: _get(channelDetails, 'id', null).toString(),
    createdDate: _get(channelDetails, 'date', null),
    title: _get(channelDetails, 'title', null),
    firstName: _get(channelDetails, 'firstName', null),
    lastName: _get(channelDetails, 'lastName', null),
    userName: _get(channelDetails, 'username', null),
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
