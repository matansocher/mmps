import type { Bot } from 'grammy';
import type { Message } from 'grammy/types';
import { TELEGRAM_MAX_MESSAGE_LENGTH, TELEGRAM_MAX_RICH_MESSAGE_LENGTH } from '../constants';

export async function sendShortenedMessage(bot: Bot, chatId: number, message: string, form = {}): Promise<Message.TextMessage> {
  message = message.slice(0, TELEGRAM_MAX_MESSAGE_LENGTH);
  return bot.api.sendMessage(chatId, message, form);
}

export async function sendStyledMessage(bot: Bot, chatId: number, message: string, parseMode: string = 'Markdown', form = {}): Promise<Message.TextMessage> {
  message = message.slice(0, TELEGRAM_MAX_MESSAGE_LENGTH);
  try {
    return await bot.api.sendMessage(chatId, message, { parse_mode: parseMode as any, ...form });
  } catch {
    return await bot.api.sendMessage(chatId, message);
  }
}

export async function sendRichMessage(bot: Bot, chatId: number, markdown: string, form = {}): Promise<Message> {
  markdown = markdown.slice(0, TELEGRAM_MAX_RICH_MESSAGE_LENGTH);
  try {
    return await bot.api.sendRichMessage(chatId, { markdown }, form);
  } catch {
    return await sendStyledMessage(bot, chatId, markdown);
  }
}
