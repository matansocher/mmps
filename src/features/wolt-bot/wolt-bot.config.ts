import { BotCommand } from 'node-telegram-bot-api';

export const MAX_NUM_OF_SUBSCRIPTIONS_PER_USER = 3;
export const MAX_NUM_OF_RESTAURANTS_TO_SHOW = 8;
export const SUBSCRIPTION_EXPIRATION_HOURS = 4;

export const SECONDS_BETWEEN_RESTAURANTS_REFRESH_OPTIONS: Record<string, number> = {
  FAST: 60 / 2,
  MEDIUM: 60,
  SLOW: 60 * 2,
  IDLE: 60 * 15,
};

export const TOO_OLD_LIST_THRESHOLD_MS = 60000;

export const INITIAL_BOT_RESPONSE = [
  `שלום {firstName}!`,
  `אני בוט שמתריע על מסעדות שנפתחות להזמנה בוולט`,
  `פשוט תשלחו לי את שם המסעדה (באנגלית 🇺🇸), ואני אגיד לכם מתי היא נפתחת`,
  `כדי לראות את רשימת ההתראות הפתוחות אפשר להשתמש בפקודה /list`,
].join('\n');
export const GENERAL_ERROR_MESSAGE = `מצטער, אבל קרתה לי תקלה. אפשר לנסות מאוחר יותר 😥`;

export const MIN_HOUR_TO_ALERT_USER = 8;
export const MAX_HOUR_TO_ALERT_USER = 1;

export const CITIES_BASE_URL = 'https://restaurant-api.wolt.com/v1/cities';
export const RESTAURANTS_BASE_URL = 'https://consumer-api.wolt.com/v1/pages/restaurants';
export const RESTAURANT_LINK_BASE_URL = 'https://wolt.com/en/isr/{area}/restaurant/{slug}';

// the order of this array is important, this will determine the order of multiple results in restaurants search
export const CITIES_SLUGS_SUPPORTED = ['hasharon'];
// export const CITIES_SLUGS_SUPPORTED = ['tel-aviv', 'hasharon', 'haifa', 'petah-tikva', 'rishon-lezion-hashfela-area', 'jerusalem', 'netanya'];
// 'afula-emek-yizrael-area'
// 'ashdod'
// 'ashkelon'
// 'beer-sheva'
// 'eilat'
// 'haifa'
// 'hasharon'
// 'jerusalem'
// 'karmiel-area'
// 'kiryat-gat-area'
// 'kiryat-shmona-area'
// 'mevaseret-zion-area'
// 'modiin'
// 'nazareth---nof-hagalil-area'
// 'netanya'
// 'netivot-sderot-area'
// 'pardes-hanna'
// 'petah-tikva'
// 'rishon-lezion-hashfela-area'
// 'rosh-pinna---zefat-area'
// 'tel-aviv'
// 'yokneam'

export const WOLT_BOT_COMMANDS: Record<string, BotCommand> = {
  START: { command: '/start', description: 'התחל מהתחלה' },
  LIST: { command: '/list', description: 'רשימת ההתראות הפתוחות' },
};

export const HOUR_OF_DAY_TO_REFRESH_MAP = {
  0: SECONDS_BETWEEN_RESTAURANTS_REFRESH_OPTIONS.SLOW,
  1: SECONDS_BETWEEN_RESTAURANTS_REFRESH_OPTIONS.SLOW,
  2: SECONDS_BETWEEN_RESTAURANTS_REFRESH_OPTIONS.SLOW,
  3: SECONDS_BETWEEN_RESTAURANTS_REFRESH_OPTIONS.SLOW,

  4: SECONDS_BETWEEN_RESTAURANTS_REFRESH_OPTIONS.IDLE,
  5: SECONDS_BETWEEN_RESTAURANTS_REFRESH_OPTIONS.IDLE,
  6: SECONDS_BETWEEN_RESTAURANTS_REFRESH_OPTIONS.IDLE,
  7: SECONDS_BETWEEN_RESTAURANTS_REFRESH_OPTIONS.IDLE,
  8: SECONDS_BETWEEN_RESTAURANTS_REFRESH_OPTIONS.IDLE,
  9: SECONDS_BETWEEN_RESTAURANTS_REFRESH_OPTIONS.IDLE,
  10: SECONDS_BETWEEN_RESTAURANTS_REFRESH_OPTIONS.IDLE,

  11: SECONDS_BETWEEN_RESTAURANTS_REFRESH_OPTIONS.FAST,
  12: SECONDS_BETWEEN_RESTAURANTS_REFRESH_OPTIONS.FAST,
  13: SECONDS_BETWEEN_RESTAURANTS_REFRESH_OPTIONS.FAST,
  14: SECONDS_BETWEEN_RESTAURANTS_REFRESH_OPTIONS.FAST,
  15: SECONDS_BETWEEN_RESTAURANTS_REFRESH_OPTIONS.FAST,

  16: SECONDS_BETWEEN_RESTAURANTS_REFRESH_OPTIONS.MEDIUM,
  17: SECONDS_BETWEEN_RESTAURANTS_REFRESH_OPTIONS.MEDIUM,

  18: SECONDS_BETWEEN_RESTAURANTS_REFRESH_OPTIONS.FAST,
  19: SECONDS_BETWEEN_RESTAURANTS_REFRESH_OPTIONS.FAST,
  20: SECONDS_BETWEEN_RESTAURANTS_REFRESH_OPTIONS.FAST,
  21: SECONDS_BETWEEN_RESTAURANTS_REFRESH_OPTIONS.FAST,
  22: SECONDS_BETWEEN_RESTAURANTS_REFRESH_OPTIONS.FAST,
  23: SECONDS_BETWEEN_RESTAURANTS_REFRESH_OPTIONS.FAST,
};

export enum BOT_ACTIONS {
  REMOVE = 'remove',
}

export const ANALYTIC_EVENT_NAMES = {
  START: 'START',
  LIST: 'LIST',
  SEARCH: 'SEARCH',
  SUBSCRIBE: 'SUBSCRIBE',
  UNSUBSCRIBE: 'UNSUBSCRIBE',
  SUBSCRIPTION_FULFILLED: 'SUBSCRIPTION_FULFILLED',
  SUBSCRIPTION_FAILED: 'SUBSCRIPTION_FAILED',
  ERROR: 'ERROR',
};
