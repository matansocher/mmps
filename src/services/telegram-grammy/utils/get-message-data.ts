import type { Context } from 'grammy';
import type { UserDetails } from '../types';

export type MessageData = {
  readonly chatId: number;
  readonly messageId: number;
  readonly replyToMessageId: number;
  readonly replyToMessageText: string;
  readonly userDetails: UserDetails;
  readonly text: string;
  readonly audio: any;
  readonly video: any;
  readonly photo: any;
  readonly file: any;
  readonly date: number;
  readonly location: {
    readonly lat: number;
    readonly lon: number;
  };
};

export function getMessageData(ctx: Context): MessageData {
  const message = ctx.message ?? ctx.editedMessage;
  return {
    chatId: ctx.chat?.id ?? null,
    messageId: message?.message_id ?? null,
    replyToMessageId: message?.reply_to_message?.message_id ?? null,
    replyToMessageText: message?.reply_to_message?.text ?? null,
    userDetails: {
      chatId: ctx.chat?.id ?? null,
      telegramUserId: ctx.from?.id ?? null,
      firstName: ctx.from?.first_name ?? null,
      lastName: ctx.from?.last_name ?? null,
      username: ctx.from?.username ?? null,
    },
    text: message?.text ?? message?.caption ?? '',
    audio: message?.audio ?? message?.voice ?? null,
    video: message?.video ?? null,
    photo: message?.photo ?? message?.sticker ?? null,
    file: message?.document ?? null,
    date: message?.date ?? null,
    location: {
      lat: message?.location?.latitude ?? null,
      lon: message?.location?.longitude ?? null,
    },
  };
}
