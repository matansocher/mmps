import type { TelegramBotConfig } from '@services/telegram';

export const BOT_CONFIG: TelegramBotConfig = {
  id: 'EXPENSES',
  name: 'Expenses Bot 💰',
  token: 'EXPENSES_TELEGRAM_BOT_TOKEN',
  commands: {
    START: { command: '/start', description: 'Open expenses app', hide: true },
  },
};

export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
export const XLSX_EXT_RE = /\.xlsx$/i;
