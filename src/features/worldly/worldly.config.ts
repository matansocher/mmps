import { TelegramBotConfig } from '@services/telegram';

export const BOT_CONFIG: TelegramBotConfig = {
  id: 'WORLDLY',
  name: 'Worldly Bot 🌍',
  token: 'WORLDLY_TELEGRAM_BOT_TOKEN',
  commands: {
    START: { command: '/start', description: 'התחל מהתחלה', hide: true },
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
  RANDOM: 'RANDOM',
  MAP: 'MAP',
  US_MAP: 'US_MAP',
  FLAG: 'FLAG',
  CAPITAL: 'CAPITAL',
  ANSWERED: 'ANSWERED',
  DAILY_AMOUNT: 'DAILY_AMOUNT',
  SET_DAILY_AMOUNT: 'SET_DAILY_AMOUNT',
  CONTACT: 'CONTACT',
  ERROR: 'ERROR',
};

export enum BOT_ACTIONS {
  START = 'start',
  STOP = 'stop',
  SET_DAILY_AMOUNT = 'set_daily__amount',
  DAILY_AMOUNT = 'daily_amount',
  CONTACT = 'contact',
  MAP = 'm',
  US_MAP = 'us_m',
  FLAG = 'f',
  CAPITAL = 'c',
}

// export const INTERVAL_HOURS_BY_PRIORITY = [12, 17, 20, 13, 16, 19, 14, 15, 18];
export const INTERVAL_HOURS_BY_PRIORITY = [12];

export const DEFAULT_DAILY_AMOUNT = 2;

export const CONTINENTS = {
  AFRICA: { name: 'Africa', hebrewName: 'אפריקה' },
  ASIA: { name: 'Asia', hebrewName: 'אסיה' },
  EUROPE: { name: 'Europe', hebrewName: 'אירופה' },
  NORTH_AMERICA: { name: 'North America', hebrewName: 'צפון אמריקה' },
  OCEANIA: { name: 'Oceania', hebrewName: 'אוקיאניה' },
  SOUTH_AMERICA: { name: 'South America', hebrewName: 'דרום אמריקה' },
};
