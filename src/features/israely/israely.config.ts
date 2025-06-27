import { TelegramBotConfig } from '@services/telegram';

export const BOT_CONFIG: TelegramBotConfig = {
  id: 'ISRAELY',
  name: 'Israely Bot 🇮🇱',
  token: 'ISRAELY_TELEGRAM_BOT_TOKEN',
  commands: {
    START: { command: '/start', description: 'התחל מהתחלה', hide: true },
    MAP: { command: '/map', description: '🗺️ מפה 🗺️' },
    ACTIONS: { command: '/actions', description: '⚙️ פעולות ⚙️' },
  },
};

export const ANALYTIC_EVENT_NAMES = {
  START: 'START',
  STOP: 'STOP',
  MAP: 'MAP',
  ANSWERED: 'ANSWERED',
  CONTACT: 'CONTACT',
  STATISTICS: 'STATISTICS',
  ERROR: 'ERROR',
};

export enum BOT_ACTIONS {
  START = 'start',
  STOP = 'stop',
  CONTACT = 'contact',
  STATISTICS = 'statistics',
  MAP = 'm',
}
