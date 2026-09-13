export const MINDLOOP_DB_NAME = 'Mindloop';
export const MINDLOOP_PLAYERS_COLLECTION = 'Players';

/** Newest-first play history is capped server-side to keep documents small. */
export const MINDLOOP_MAX_HISTORY_ENTRIES = 500;

/** Bounded retries for revision-guarded compare-and-swap merges. */
export const MINDLOOP_MAX_MERGE_RETRIES = 5;
