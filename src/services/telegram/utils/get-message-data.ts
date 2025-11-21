import type { Message } from 'node-telegram-bot-api';
import { UserDetails } from '../types';

type TelegramMessageData = {
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

export function getMessageData(message: Message): TelegramMessageData {
  return {
    chatId: message?.chat?.id ?? null,
    messageId: message?.message_id ?? null,
    replyToMessageId: message?.reply_to_message?.message_id ?? null,
    replyToMessageText: message?.reply_to_message?.text ?? null,
    userDetails: {
      chatId: message?.chat?.id ?? null,
      telegramUserId: message?.from?.id ?? null,
      firstName: message?.from?.first_name ?? null,
      lastName: message?.from?.last_name ?? null,
      username: message?.from?.username ?? null,
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
