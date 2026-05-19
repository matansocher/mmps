import type { TelegramBotConfig } from '@services/telegram';

export const BOT_CONFIG: TelegramBotConfig = {
  id: 'WORLDLY',
  name: 'Worldly Bot 🌍',
  token: 'WORLDLY_TELEGRAM_BOT_TOKEN',
  commands: {
    APP: { command: '/app', description: '📱 פתח אפליקציה 📱' },
    START: { command: '/start', description: 'התחל מהתחלה', hide: true },
    FIRE_MODE: { command: '/fire_mode', description: '🔥 משחק רצוף 🔥' },
    RANDOM: { command: '/random', description: '🌎 משחק אקראי 🌎' },
    MAP: { command: '/map', description: '🗺️ מפה 🗺️' },
    FLAG: { command: '/flag', description: '🏁 דגל 🏁' },
    CAPITAL: { command: '/capital', description: '🏛️ עיר בירה 🏛️' },
    US_MAP: { command: '/usmap', description: '🇺🇸 מפת ארצות הברית 🇺🇸' },
    ACTIONS: { command: '/actions', description: '⚙️ פעולות ⚙️' },
  },
};

export const ANALYTIC_EVENT_NAMES = {
  START: 'START',
  STOP: 'STOP',
  FIRE: 'FIRE',
  RANDOM: 'RANDOM',
  MAP: 'MAP',
  US_MAP: 'US_MAP',
  FLAG: 'FLAG',
  CAPITAL: 'CAPITAL',
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
  FIRE = 'fire',
  RANDOM = 'rand',
  MAP = 'm',
  US_MAP = 'us_m',
  FLAG = 'f',
  CAPITAL = 'c',
}

export const INLINE_KEYBOARD_SEPARATOR = '|';
