export const IGDB_BASE_URL = 'https://api.igdb.com/v4';
export const TWITCH_TOKEN_URL = 'https://id.twitch.tv/oauth2/token';

export const PS5_PLATFORM_ID = 167;

// IGDB release_dates.region — worldwide is the most representative when a game has several regional entries.
export const WORLDWIDE_REGION_ID = 8;

// IGDB release_dates.status — 2 means the date is announced as TBA.
export const TBA_STATUS_ID = 2;

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
  'release_dates.platform',
  'release_dates.region',
  'release_dates.y',
  'release_dates.m',
].join(',');
