export const RAIL_API_SEARCH_URL = 'https://rail-api.rail.co.il/rjpa/api/v1/timetable/searchTrain';

// Public key bundled in rail.co.il's main.js (not a personal secret). If requests start failing with 401, grab the new one from the site's bundle.
export const RAIL_API_SUBSCRIPTION_KEY = '5e64d66cf03f4547bcac5de2de06b566';

export const RAIL_API_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
  'ocp-apim-subscription-key': RAIL_API_SUBSCRIPTION_KEY,
  'Content-Type': 'application/json',
} as const;

export const DEFAULT_TRAINS_LIMIT = 5;

// Common nicknames / alternative spellings → station id
export const STATION_ALIASES: Readonly<Record<string, number>> = {
  savidor: 3700,
  'tel aviv center': 3700,
  'tel aviv merkaz': 3700,
  סבידור: 3700,
  'תא מרכז': 3700,
  'תל אביב מרכז': 3700,
  navon: 680,
  נבון: 680,
  airport: 8600,
  'ben gurion': 8600,
  נתבג: 8600,
  'שדה התעופה': 8600,
  'בן גוריון': 8600,
  herzliya: 3500,
  'tel aviv university': 3600,
  'תא אוניברסיטה': 3600,
  'beer sheva center': 7320,
  'beer sheva north': 7300,
  akko: 1500,
  acre: 1500,
  'rishon lezion harishonim': 9100,
  'rishon lezion moshe dayan': 9800,
  'kiryat haim': 700,
  hashmona: 2100,
  'bat galim': 2200,
  'hof hacarmel': 2300,
  'hof hakarmel': 2300,
  'חוף הכרמל': 2300,
  'בת גלים': 2200,
  'מרכז השמונה': 2100,
  malha: 6700,
  מלחה: 6700,
  modiin: 400,
};
