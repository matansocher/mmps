export const STICKERS_WEBHOOK_PATH = '/whatsapp-webhook';

export const STICKERS_DB_NAME = 'Whatsapp';
export const STICKERS_COLLECTION = 'stickers';
export const STICKERS_SEARCHES_COLLECTION = 'searches';
export const STICKERS_CARS_SEARCH_COUNTS_COLLECTION = 'cars_search_counts';

// TODO: Set to the intentional untagged sticker's MongoDB _id (24 hex characters). Empty disables the special cycle.
export const CARS_SURPRISE_STICKER_ID = '';

// Meta's per-user pair rate limit allows short bursts (~10) but only ~1 msg/6s sustained. A page (6 stickers + the "עוד" message) fits in a burst,
// and the time the user takes to tap "עוד" lets the quota recover.
export const STICKER_PAGE_SIZE = 6;
export const STICKER_SEND_DELAY_MS = 1000; // gap between stickers in a page
export const STICKER_RATE_LIMIT_BACKOFF_MS = 30_000; // wait after error 131056 before retrying once
export const STICKER_MEDIA_REUSE_MS = 25 * 24 * 60 * 60 * 1000; // Meta keeps uploaded media for 30 days

// Meta's sticker limits. Oversized stickers upload and "send" fine, then silently fail delivery.
export const STICKER_DIMENSION = 512;
export const STICKER_MAX_STATIC_BYTES = 100 * 1024;
export const STICKER_MAX_ANIMATED_BYTES = 500 * 1024;
