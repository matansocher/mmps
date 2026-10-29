export const STICKERS_WEBHOOK_PATH = '/whatsapp-webhook';

export const STICKERS_DB_NAME = 'Whatsapp';
export const STICKERS_COLLECTION = 'stickers';
export const STICKERS_SEARCHES_COLLECTION = 'searches';
export const STICKERS_CARS_SEARCH_COUNTS_COLLECTION = 'cars_search_counts';

// MongoDB _id of the intentional untagged sticker. Empty disables the special cycle.
export const CARS_SURPRISE_STICKER_ID = '6ac6a21f06cf38b203478389';

// Names shown in "%" stats instead of phone numbers. Keys are digits only; lookups strip "+" and other non-digits.
export const SEARCHER_NAMES: Record<string, string> = {
  '972545429402': 'מתן',
  '972547669886': 'ברויאר',
  '972546736789': 'עומרי',
  '972526566765': 'דור',
  '972544456078': 'דורון',
  '972508565456': 'ליאור',
  '972503222347': 'ניבו',
  '972509404893': 'שרון',
};

// Searchers left out of "%" stats. Digits only.
export const STATS_HIDDEN_SEARCHERS = ['972545429402'];

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

// Who gets a newly saved sticker when its uploader taps "פרסם". Test list for now; the uploader is always skipped.
export const PUBLISH_RECIPIENTS = ['972547669886', '972545429402'];
export const PUBLISH_DELIVERY_TRACKING_MS = 10 * 60 * 1000; // how long to wait for a broadcast sticker's failed status before forgetting it
export const PUBLISH_SEND_DELAY_MS = 1000; // gap between recipients
// Approved Meta template for recipients outside the 24h window; its quick-reply button "הצג" sends the sticker.
export const NEW_STICKER_TEMPLATE_NAME = 'new_sticker';
export const NEW_STICKER_TEMPLATE_LANGUAGE = 'he';
