import { get as _get } from 'lodash';
import { TelegramEvent, TelegramMessage } from '../interface';

export function getMessageData(event: TelegramEvent): TelegramMessage {
  return {
    id: _get(event, 'message.id', _get(event, 'id', null)),
    userId: _get(event, 'message.fromId.userId', _get(event, 'userId', _get(event, 'message.peerId.userId', null))),
    channelId: _get(event, 'message.peerId.channelId', '').toString(),
    date: _get(event, 'message.date', _get(event, 'date', null)),
    text: _get(event, 'message.message', _get(event, 'message', null)),
  };
}
