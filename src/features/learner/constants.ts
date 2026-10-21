export const LEARNER_DB_NAME = 'Learner';
export const LEARNER_PROGRESS_COLLECTION = 'Progress';
export const LEARNER_SUBSCRIPTIONS_COLLECTION = 'Subscriptions';
export const LEARNER_DELIVERIES_COLLECTION = 'Deliveries';

/** Bounded retries for revision-guarded compare-and-swap merges. */
export const LEARNER_MAX_MERGE_RETRIES = 5;

/** Reminder hours (local hour, Asia/Jerusalem). Once daily. Additional slots only fire if the previous one was answered. */
export const REMINDER_HOURS = [11];

/** Minute within the reminder hour(s) at which reminders fire (local, Asia/Jerusalem). */
export const REMINDER_MINUTE = 15;

// The immediate welcome bite is tracked separately so it never consumes a scheduled reminder slot.
export const LEARNER_WELCOME_DELIVERY_SLOT = -1;

/** Daily-delivery docs self-expire after this many days. */
export const LEARNER_DELIVERY_TTL_DAYS = 14;

export const LEARNER_PRACTICE_ATTEMPTS_COLLECTION = 'PracticeAttempts';
export const LEARNER_PRACTICE_STATS_COLLECTION = 'PracticeStats';

export const PRACTICE_ANSWER_MAX_CHARS = 4000;
export const PRACTICE_FOLLOWUP_MAX_CHARS = 2000;
export const PRACTICE_MAX_FOLLOWUPS = 30;
export const PRACTICE_AUDIO_MAX_BYTES = 8 * 1024 * 1024;
// Graded scores below this mark the lesson 'fuzzy' so it resurfaces in Review.
export const PRACTICE_FUZZY_THRESHOLD = 60;
export const PRACTICE_CORRECT_THRESHOLD = 80;
export const PRACTICE_PARTIAL_THRESHOLD = 50;
// Questions asked this recently are never picked again.
export const PRACTICE_RECENT_WINDOW = 5;
