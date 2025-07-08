import { TelegramBotConfig } from '@services/telegram';

export const BOT_CONFIG: TelegramBotConfig = {
  id: 'CALLER',
  name: 'Caller Bot 🔔',
  token: 'CALLER_TELEGRAM_BOT_TOKEN',
  commands: {
    START: { command: '/start', description: 'התחל מהתחלה', hide: true },
    LIST: { command: '/list', description: '⏰ רשימת ההתראות הפתוחות ⏰' },
  },
};

export const MAX_NUM_OF_SUBSCRIPTIONS_PER_USER = 6;

export enum BOT_ACTIONS {
  REMOVE = 'remove',
}
