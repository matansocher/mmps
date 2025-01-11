import { get as _get } from 'lodash';
import { CallbackQuery } from 'node-telegram-bot-api';
import { ITelegramCallbackQueryData } from '../interface';

export function getCallbackQueryData(callbackQuery: CallbackQuery): ITelegramCallbackQueryData {
  return {
    callbackQueryId: _get(callbackQuery, 'id', null),
    chatId: _get(callbackQuery, 'from.id', null),
    date: _get(callbackQuery, 'message.date', null),
    firstName: _get(callbackQuery, 'from.first_name', null),
    lastName: _get(callbackQuery, 'from.last_name', null),
    text: _get(callbackQuery, 'message.text', null),
    data: _get(callbackQuery, 'data', null),
  };
}
