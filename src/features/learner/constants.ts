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

/** Daily-delivery docs self-expire after this many days. */
export const LEARNER_DELIVERY_TTL_DAYS = 14;
