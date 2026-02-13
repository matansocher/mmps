import { env } from 'node:process';
import type { TelegramBotConfig } from '@services/telegram-grammy';

export const BOT_CONFIG: TelegramBotConfig = {
  id: 'CHATBOT',
  name: 'Chatbot 🤖',
  token: 'CHATBOT_TELEGRAM_BOT_TOKEN',
  commands: {
    START: { command: '/start', description: 'Start over', hide: true },
    HELP: { command: '/help', description: '❓ Show available tools' },
  },
};

export const CHATBOT_CONFIG = {
  maxThreadMessages: parseInt(env.CHATBOT_MAX_THREAD_MESSAGES || '50', 10),
  preserveSystemMessages: true,
  preserveFirstMessage: true,
};
