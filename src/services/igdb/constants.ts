export const IGDB_BASE_URL = 'https://api.igdb.com/v4';
export const TWITCH_TOKEN_URL = 'https://id.twitch.tv/oauth2/token';

export const PS5_PLATFORM_ID = 167;

// IGDB external_games.category — 36 is the PlayStation Store listing, whose uid is the store
// product id. Concept ids are global, so the US listing still resolves other storefronts.
export const PLAYSTATION_STORE_CATEGORY_ID = 36;

// IGDB release_dates.region — worldwide is the most representative when a game has several regional entries.
export const WORLDWIDE_REGION_ID = 8;

// IGDB release_dates.status — 2 means the date is announced as TBA.
export const TBA_STATUS_ID = 2;

// IGDB release_dates.category — the date-format precision. Only 0 (YYYYMMMMDD) is an exact day
// we can safely compare against "now"; 1 (month), 2 (year) and 3-6 (quarters) are fuzzy windows
// whose timestamp points at the start of the period, so they must not be treated as a real release.
export const FULL_DATE_CATEGORY_ID = 0;

export const IGDB_IMAGE_BASE_URL = 'https://images.igdb.com/igdb/image/upload/t_cover_big';

// Twitch client-credentials tokens live ~60 days, refresh a minute before expiry to avoid edge failures.
export const TOKEN_SAFETY_WINDOW_MS = 60 * 1000;

export const GAME_FIELDS = [
  'id',
  'name',
  'slug',
  'cover.image_id',
  'release_dates.date',
  'release_dates.human',
  'release_dates.status',
  'release_dates.category',
  'release_dates.platform',
  'release_dates.region',
  'release_dates.y',
  'release_dates.m',
  'external_games.category',
  'external_games.uid',
  'external_games.url',
].join(',');
