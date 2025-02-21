import type TelegramBot from 'node-telegram-bot-api';
import type { ParseMode } from 'node-telegram-bot-api';

const telegramMaxCharsMessage = 4096;

export async function sendStyledMessage(bot: TelegramBot, chatId: number, message: string, parse_mode: ParseMode = 'Markdown', form = {}): Promise<void> {
  try {
    message = message.slice(0, telegramMaxCharsMessage);
    await bot.sendMessage(chatId, message, { parse_mode, ...form });
  } catch {
    await bot.sendMessage(chatId, message);
  }
}

export async function sendShortenedMessage(bot: TelegramBot, chatId: number, message: string, form = {}): Promise<void> {
  message = message.slice(0, telegramMaxCharsMessage);
  await bot.sendMessage(chatId, message, form);
}
