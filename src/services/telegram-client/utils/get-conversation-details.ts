import { get as _get } from 'lodash';
import { TelegramClient } from 'telegram';
import { ConversationDetails } from '../interface';

export async function getConversationDetails(telegramClient: TelegramClient, entityId: string): Promise<ConversationDetails> {
  const channelDetails = (await telegramClient.getEntity(entityId)) as any;
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
