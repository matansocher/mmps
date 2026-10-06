export const STICKERS_WEBHOOK_PATH = '/whatsapp-webhook';

export const STICKERS_DB_NAME = 'Whatsapp';
export const STICKERS_COLLECTION = 'stickers';
export const STICKERS_SEARCHES_COLLECTION = 'searches';

// Meta's per-user pair rate limit allows short bursts but only ~1 msg/6s sustained, so search results go out fast at first, then slow down.
export const STICKER_BURST_SIZE = 10;
export const STICKER_SEND_DELAY_MS = 1000; // gap between results within the burst
export const STICKER_SUSTAINED_SEND_DELAY_MS = 6000; // gap between results after the burst
export const STICKER_RATE_LIMIT_BACKOFF_MS = 30_000; // wait after error 131056 before retrying once
export const STICKER_MEDIA_REUSE_MS = 25 * 24 * 60 * 60 * 1000; // Meta keeps uploaded media for 30 days

// Meta's sticker limits. Oversized stickers upload and "send" fine, then silently fail delivery.
export const STICKER_DIMENSION = 512;
export const STICKER_MAX_STATIC_BYTES = 100 * 1024;
export const STICKER_MAX_ANIMATED_BYTES = 500 * 1024;
