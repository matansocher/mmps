import type { TelegramBotConfig } from '@services/telegram';

export const BOT_CONFIG: TelegramBotConfig = {
  id: 'LEARNER',
  name: 'Learner Bot 📚',
  token: 'LEARNER_TELEGRAM_BOT_TOKEN',
  commands: {
    START: { command: '/start', description: 'Start learning', hide: true },
    TODAY: { command: '/today', description: "📚 Today's bite" },
    APP: { command: '/app', description: '🚀 Open the app' },
    STOP: { command: '/stop', description: '🛑 Stop daily reminders' },
  },
};

export const ANALYTIC_EVENT_NAMES = {
  START: 'START',
  STOP: 'STOP',
  TODAY: 'TODAY',
  APP: 'APP',
  RATED: 'RATED',
  REMINDER: 'REMINDER',
  ERROR: 'ERROR',
} as const;

export enum BOT_ACTIONS {
  GOT_IT = 'got_it',
  FUZZY = 'fuzzy',
  NOPE = 'nope',
  START = 'start',
  STOP = 'stop',
}

export const INLINE_KEYBOARD_SEPARATOR = '|';
