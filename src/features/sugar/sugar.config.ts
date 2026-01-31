import { env } from 'node:process';
import { TelegramBotConfig } from '@services/telegram';

export const BOT_CONFIG: TelegramBotConfig = {
  id: 'SUGAR',
  name: 'Sugar 🩸',
  token: 'SUGAR_TELEGRAM_BOT_TOKEN',
  commands: {
    START: { command: '/start', description: 'Start', hide: true },
    HELP: { command: '/help', description: '❓ Show help' },
    ACTIVE: { command: '/active', description: '📊 Show active session' },
    HISTORY: { command: '/history', description: '📜 Recent sessions' },
  },
};

export const SUGAR_CONFIG = {
  maxThreadMessages: parseInt(env.SUGAR_MAX_THREAD_MESSAGES || '30', 10),
  preserveSystemMessages: true,
  preserveFirstMessage: true,
};
