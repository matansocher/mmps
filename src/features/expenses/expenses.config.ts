import type { TelegramBotConfig } from '@services/telegram';

export const BOT_CONFIG: TelegramBotConfig = {
  id: 'EXPENSES',
  name: 'Expenses Bot 💰',
  token: 'EXPENSES_TELEGRAM_BOT_TOKEN',
  commands: {
    START: { command: '/start', description: 'Open expenses app', hide: true },
  },
};
