export const WHATSAPP_WEBHOOK_PATH = '/whatsapp-webhook';
export const WHATSAPP_SIGNATURE_HEADER = 'x-hub-signature-256';

export const WHATSAPP_DB_NAME = 'Whatsapp';
export const WHATSAPP_STICKERS_COLLECTION = 'stickers';

export const STICKER_TAG_WINDOW_MS = 5 * 60 * 1000; // plain text this soon after a new untagged sticker tags it
export const STICKER_SEARCH_LIMIT = 3;
export const STICKER_SEND_DELAY_MS = 1000; // gap between search results; Meta's pair rate limit allows short bursts, ~1 msg/6s sustained
export const STICKER_MEDIA_REUSE_MS = 25 * 24 * 60 * 60 * 1000; // Meta keeps uploaded media for 30 days

// Meta's sticker limits. Oversized stickers upload and "send" fine, then silently fail delivery.
export const STICKER_DIMENSION = 512;
export const STICKER_MAX_STATIC_BYTES = 100 * 1024;
export const STICKER_MAX_ANIMATED_BYTES = 500 * 1024;
