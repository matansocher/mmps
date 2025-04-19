import { get as _get } from 'lodash';
import type { Message } from 'node-telegram-bot-api';
import type { TelegramMessageData } from '../types';

export function getMessageData(message: Message): TelegramMessageData {
  return {
    chatId: _get(message, 'chat.id', null),
    messageId: _get(message, 'message_id', null),
    replyToMessageId: _get(message, 'reply_to_message.message_id', null),
    replyToMessageText: _get(message, 'reply_to_message.text', null),
    userDetails: {
      chatId: _get(message, 'chat.id', null),
      telegramUserId: _get(message, 'from.id', null),
      firstName: _get(message, 'from.first_name', null),
      lastName: _get(message, 'from.last_name', null),
      username: _get(message, 'from.username', null),
    },
    text: _get(message, 'text', '') || _get(message, 'caption', ''),
    audio: _get(message, 'audio', null) || _get(message, 'voice', null),
    video: _get(message, 'video', null),
    photo: _get(message, 'photo', null) || _get(message, 'sticker', null),
    file: _get(message, 'document', null),
    date: _get(message, 'date', null),
  };
}
