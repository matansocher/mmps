export const DB_NAME = 'TransferTracker';

// Each rumour stage appears in this many consecutive digests before it is retired,
// so a deal is not missed if one evening's message goes unread.
export const MAX_DIGEST_SENDS = 2;

// How long a retired rumour stage is remembered, to suppress re-announcing it.
export const SENT_RUMOUR_TTL_SECONDS = 120 * 24 * 60 * 60; // 120 days
