import type { Message } from 'node-telegram-bot-api';
import type { TelegramMessageData } from '../interface';

export function getMessageData(message: Message): TelegramMessageData {
  return {
    chatId: message?.chat.id ?? null,
    messageId: message?.message_id ?? null,
    replyToMessageId: message?.reply_to_message?.message_id ?? 0,
    replyToMessageText: message?.reply_to_message?.text ?? '',
    telegramUserId: message?.from?.id ?? 0,
    firstName: message?.from?.first_name ?? '',
    lastName: message?.from?.last_name ?? '',
    username: message?.from?.username ?? '',
    text: (message?.text || message?.caption) ?? '',
    audio: (message?.audio || message?.voice) ?? null,
    video: message?.video ?? '',
    photo: (message?.photo || message?.sticker) ?? null,
    file: message?.document ?? null,
    date: message?.date ?? null,
  };
}
