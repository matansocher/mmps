import type { Bot } from 'grammy';
import type { Message } from '@grammyjs/types';
import { TELEGRAM_MAX_MESSAGE_LENGTH } from '../constants';

export async function sendShortenedMessage(bot: Bot, chatId: number, message: string, form = {}): Promise<Message.TextMessage> {
  message = message.slice(0, TELEGRAM_MAX_MESSAGE_LENGTH);
  return bot.api.sendMessage(chatId, message, form);
}