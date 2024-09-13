export const MAX_NUM_OF_RESTAURANTS_TO_SHOW = 7;
export const SUBSCRIPTION_EXPIRATION_HOURS = 4;

export const SECONDS_BETWEEN_RESTAURANTS_REFRESH_OPTIONS: Record<string, number> = {
  FAST: 60 / 2,
  MEDIUM: 60,
  SLOW: 60 * 2,
  IDLE: 60 * 15,
};

export const TOO_OLD_LIST_THRESHOLD_MS = 60000;

export const INITIAL_BOT_RESPONSE = `Hi {firstName}!\n\nI'm a bot that can alert you when a wolt restaurant opens\n\nYou can tell me the restaurant name you want to check and I will let you know once it is open\n\nTo show current notification registrations please write: /show\n\n`;

export const DEFAULT_TIMEZONE = `Asia/Jerusalem`;

export const MIN_HOUR_TO_ALERT_USER = 8;
export const MAX_HOUR_TO_ALERT_USER = 23;

export const RESTAURANTS_BASE_URL = 'https://consumer-api.wolt.com/v1/pages/restaurants';
export const RESTAURANT_BASE_URL = 'https://consumer-api.wolt.com/order-xp/web/v1/venue/slug/{slug}/dynamic/';
export const RESTAURANT_LINK_BASE_URL = 'https://wolt.com/en/isr/{area}/restaurant/{slug}';
export const CITIES_BASE_URL = 'https://restaurant-api.wolt.com/v1/cities';

export const CITIES_SLUGS_SUPPORTED = ['hasharon', 'tel-aviv'];
// 'afula-emek-yizrael-area',
// 'ashdod',
// 'ashkelon',
// 'beer-sheva',
// 'eilat',
// 'ness-ziona---rehovot',
// 'haifa',
// 'hasharon',
// 'jerusalem',
// 'karmiel-area',
// 'kiryat-shmona-area',
// 'mevaseret-zion-area',
// 'modiin',
// 'nazareth---nof-hagalil-area',
// 'netanya',
// 'netivot-sderot-area',
// 'pardes-hanna',
// 'petah-tikva',
// 'rishon-lezion',
// 'rosh-pinna---zefat-area',
// 'tel-aviv',
// 'yavne',
// 'yokneam',

export const WOLT_BOT_OPTIONS = {
  START: '/start',
  SHOW: '/show',
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

export const ANALYTIC_EVENT_NAMES = {
  START: 'START',
  SHOW: 'SHOW',
  SEARCH: 'SEARCH',
  SUBSCRIBE: 'SUBSCRIBE',
  UNSUBSCRIBE: 'UNSUBSCRIBE',
  SUBSCRIPTION_FULFILLED: 'SUBSCRIPTION_FULFILLED',
  SUBSCRIPTION_FAILED: 'SUBSCRIPTION_FAILED',
  ERROR: 'ERROR',
};
