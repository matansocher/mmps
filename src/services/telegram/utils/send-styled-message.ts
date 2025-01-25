import TelegramBot, { ParseMode } from 'node-telegram-bot-api';

export async function sendStyledMessage(
  bot: TelegramBot,
  chatId: number,
  message: string,
  parse_mode: ParseMode = 'Markdown',
  form = {},
): Promise<void> {
  try {
    await bot.sendMessage(chatId, message, { parse_mode, ...form });
  } catch (err) {
    await bot.sendMessage(chatId, message);
  }
}
