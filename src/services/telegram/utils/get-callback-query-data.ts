import type { CallbackQuery } from 'node-telegram-bot-api';
import type { TelegramCallbackQueryData } from '../interface';

export function getCallbackQueryData(callbackQuery: CallbackQuery): TelegramCallbackQueryData {
  return {
    messageId: callbackQuery?.message?.message_id ?? 0,
    callbackQueryId: callbackQuery?.id ?? null,
    chatId: callbackQuery?.from?.id ?? null,
    date: callbackQuery?.message?.date ?? 0,
    firstName: callbackQuery?.from?.first_name ?? '',
    lastName: callbackQuery?.from?.last_name ?? '',
    text: callbackQuery?.message?.text ?? '',
    data: callbackQuery?.data ?? '',
  };
}
