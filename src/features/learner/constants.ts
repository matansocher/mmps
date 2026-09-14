export const LEARNER_DB_NAME = 'Learner';
export const LEARNER_PROGRESS_COLLECTION = 'Progress';
export const LEARNER_SUBSCRIPTIONS_COLLECTION = 'Subscriptions';
export const LEARNER_DELIVERIES_COLLECTION = 'Deliveries';

/** Bounded retries for revision-guarded compare-and-swap merges. */
export const LEARNER_MAX_MERGE_RETRIES = 5;

/** Reminder slots (local hour, Asia/Jerusalem). A slot only fires if the previous one was answered. */
export const REMINDER_HOURS = [9, 14, 20];

/** Daily-delivery docs self-expire after this many days. */
export const LEARNER_DELIVERY_TTL_DAYS = 14;
