import type { Context } from 'grammy';
import type { UserDetails } from '../types';

export type CallbackQueryData = {
  readonly messageId: number;
  readonly callbackQueryId: string;
  readonly chatId: number;
  readonly date: number;
  readonly userDetails: UserDetails;
  readonly text: string;
  readonly data: string;
};

export function getCallbackQueryData(ctx: Context): CallbackQueryData {
  const callbackQuery = ctx.callbackQuery;
  const message = callbackQuery?.message;
  return {
    messageId: message?.message_id ?? null,
    callbackQueryId: callbackQuery?.id ?? null,
    chatId: ctx.chat?.id ?? null,
    date: message?.date ?? null,
    userDetails: {
      chatId: ctx.chat?.id ?? null,
      telegramUserId: ctx.from?.id ?? null,
      firstName: ctx.from?.first_name ?? null,
      lastName: ctx.from?.last_name ?? null,
      username: ctx.from?.username ?? null,
    },
    text: message && 'text' in message ? message.text : null,
    data: callbackQuery?.data ?? null,
  };
}
