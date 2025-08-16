import type TelegramBot from 'node-telegram-bot-api';
import type { Message, ParseMode } from 'node-telegram-bot-api';
import { BOT_BROADCAST_ACTIONS, TELEGRAM_MAX_MESSAGE_LENGTH } from '../constants';

export async function sendStyledMessage(bot: TelegramBot, chatId: number, message: string, parse_mode: ParseMode = 'Markdown', form = {}): Promise<Message> {
  try {
    message = message.slice(0, TELEGRAM_MAX_MESSAGE_LENGTH);
    return bot.sendMessage(chatId, message, { parse_mode, ...form });
  } catch {
    return bot.sendMessage(chatId, message);
  }
}

export async function sendShortenedMessage(bot: TelegramBot, chatId: number, message: string, form = {}): Promise<Message> {
  message = message.slice(0, TELEGRAM_MAX_MESSAGE_LENGTH);
  return bot.sendMessage(chatId, message, form);
}

// works fine but if message is too big or too many messages, you get an error of 429 - Too Many Requests
export async function sendMessageInStyle(bot: TelegramBot, chatId: number, message: string, form = {}): Promise<void> {
  message = message.slice(0, TELEGRAM_MAX_MESSAGE_LENGTH);

  await bot.sendChatAction(chatId, BOT_BROADCAST_ACTIONS.TYPING);
  const words = message.split(' ');
  let replyText = words[0];
  const messageRes = await bot.sendMessage(chatId, replyText, form);
  const messageId = messageRes.message_id;

  for (const word of words.slice(1)) {
    await bot.sendChatAction(chatId, BOT_BROADCAST_ACTIONS.TYPING);
    replyText += ` ${word}`;
    await bot.editMessageText(replyText, { chat_id: chatId, message_id: messageId });
  }
}
