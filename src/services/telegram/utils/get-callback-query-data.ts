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
    messageId: callbackQuery?.message?.message_id ?? null,
    callbackQueryId: callbackQuery?.id ?? null,
    chatId: callbackQuery?.from?.id ?? null,
    date: callbackQuery?.message?.date ?? null,
    userDetails: {
      chatId: callbackQuery?.from?.id ?? null,
      telegramUserId: callbackQuery?.from?.id ?? null,
      firstName: callbackQuery?.from?.first_name ?? null,
      lastName: callbackQuery?.from?.last_name ?? null,
      username: callbackQuery?.from?.username ?? null,
    },
    text: callbackQuery?.message?.text ?? null,
    data: callbackQuery?.data ?? null,
    replyMarkup: callbackQuery?.message?.reply_markup ?? null,
  };
}
