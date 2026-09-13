export const DB_NAME = 'SocialFollower';

// Explicit retention for collected-but-undelivered posts. A backlog that outlives this
// window (persistent delivery outage) is expired by Mongo instead of growing without bound.
export const PENDING_POST_TTL_SECONDS = 14 * 24 * 60 * 60; // 14 days

// Upper bound on how many pending posts are loaded per chat in a single digest run, so a
// single chat's runaway backlog can't pull the whole collection into memory at once.
export const PENDING_POST_CHAT_BATCH_SIZE = 500;
