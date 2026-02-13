import type { TelegramBotConfig } from '@services/telegram-grammy';

export const BOT_CONFIG: TelegramBotConfig = {
  id: 'COACH',
  name: 'Coach Bot ⚽️',
  token: 'COACH_TELEGRAM_BOT_TOKEN',
  commands: {
    START: { command: '/start', description: 'התחל מהתחלה', hide: true },
    TABLES: { command: '/tables', description: '📊 טבלאות 📊' },
    MATCHES: { command: '/matches', description: '🎱 מחזור הבא 🎱' },
    ACTIONS: { command: '/actions', description: '⚙️ פעולות ⚙️' },
  },
  keyboardOptions: ['היום', 'מחר', 'מחרתיים', 'אתמול'],
};

export const ANALYTIC_EVENT_NAMES = {
  START: 'START',
  STOP: 'STOP',
  SEARCH: 'SEARCH',
  CONTACT: 'CONTACT',
  TABLE: 'TABLE',
  MATCH: 'MATCH',
  CUSTOM_LEAGUES: 'CUSTOM_LEAGUES',
  CUSTOM_LEAGUES_SELECT: 'CUSTOM_LEAGUES_SELECT',
  ERROR: 'ERROR',
};

export enum BOT_ACTIONS {
  START = 'start',
  STOP = 'stop',
  CONTACT = 'contact',
  TABLE = 'table',
  MATCH = 'match',
  CUSTOM_LEAGUES = 'cust_leag',
  CUSTOM_LEAGUES_SELECT = 'cust_leag_select',
}
