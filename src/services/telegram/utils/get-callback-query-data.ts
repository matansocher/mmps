import { get as _get } from 'lodash';
import { CallbackQuery, InlineKeyboardMarkup } from 'node-telegram-bot-api';
import { UserDetails } from '../types';

type TelegramCallbackQueryData = {
  readonly messageId: number;
  readonly callbackQueryId: string;
  readonly chatId: number;
  readonly date: number;
  readonly userDetails: UserDetails;
  readonly text: string;
  readonly data: string;
  readonly replyMarkup: InlineKeyboardMarkup;
};

export function getCallbackQueryData(callbackQuery: CallbackQuery): TelegramCallbackQueryData {
  return {
    messageId: _get(callbackQuery, 'message.message_id', null),
    callbackQueryId: _get(callbackQuery, 'id', null),
    chatId: _get(callbackQuery, 'from.id', null),
    date: _get(callbackQuery, 'message.date', null),
    userDetails: {
      chatId: _get(callbackQuery, 'from.id', null),
      telegramUserId: _get(callbackQuery, 'from.id', null),
      firstName: _get(callbackQuery, 'from.first_name', null),
      lastName: _get(callbackQuery, 'from.last_name', null),
      username: _get(callbackQuery, 'from.username', null),
    },
    text: _get(callbackQuery, 'message.text', null),
    data: _get(callbackQuery, 'data', null),
    replyMarkup: _get(callbackQuery, 'message.reply_markup', null),
  };
}
