export const DEFAULT_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept-Language': 'en-US,en;q=0.9',
} as const;

export const TIKTOK_BASE_URL = 'https://www.tiktok.com';

export const TIKTOK_API_ENDPOINT = `${TIKTOK_BASE_URL}/api/post/item_list/`;

export const DEFAULT_API_PARAMS = {
  aid: '1988',
  app_language: 'en',
  app_name: 'tiktok_web',
  browser_language: 'en-US',
  browser_name: 'Mozilla',
  browser_online: 'true',
  browser_platform: 'MacIntel',
  browser_version: '5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  channel: 'tiktok_web',
  cookie_enabled: 'true',
  count: '30',
  coverFormat: '2',
  cursor: '0',
  device_platform: 'web_pc',
  from_page: 'user',
  language: 'en',
  os: 'mac',
  region: 'US',
  screen_height: '1080',
  screen_width: '1920',
  tz_name: 'America/New_York',
  webcast_language: 'en',
} as const;

export const VIDEO_ID_REFERENCES = [
  { id: BigInt('7550000000000000000'), date: new Date('2025-01-20') },
  { id: BigInt('7500000000000000000'), date: new Date('2024-06-01') },
  { id: BigInt('7450000000000000000'), date: new Date('2024-01-01') },
  { id: BigInt('7400000000000000000'), date: new Date('2023-08-01') },
  { id: BigInt('7300000000000000000'), date: new Date('2023-01-01') },
  { id: BigInt('7200000000000000000'), date: new Date('2022-06-01') },
  { id: BigInt('7100000000000000000'), date: new Date('2021-12-01') },
  { id: BigInt('7000000000000000000'), date: new Date('2021-06-01') },
  { id: BigInt('6900000000000000000'), date: new Date('2020-12-01') },
] as const;
