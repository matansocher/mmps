export type LearnerRating = 'got_it' | 'fuzzy' | 'nope';

export type GuideId = 'system-design' | 'ai-engineering';

// Mirrors the mini-app's BiteState (apps/learner-web/src/lib/types.ts).
export type LearnerBiteState = {
  readonly biteId: string;
  readonly rating: LearnerRating | null;
  readonly readAt: string | null; // ISO
  readonly dueAt: string | null; // ISO
  readonly reps: number;
  readonly gotItStreak?: number;
  readonly quizPassed: boolean;
};

// Mirrors the mini-app's LearnerProgress.
export type LearnerProgress = {
  readonly states: Record<string, LearnerBiteState>;
  readonly streak: number;
  readonly lastStudyDate: string | null; // YYYY-MM-DD (Asia/Jerusalem)
  readonly updatedAt: string | null; // ISO
};

export type LearnerProgressDocument = {
  readonly _id: number; // Telegram user id
  readonly states: Record<string, LearnerBiteState>;
  readonly streak: number;
  readonly lastStudyDate: string | null;
  readonly revision: number;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

// Client snapshot pushed up for a non-destructive merge.
export type LearnerSyncData = {
  readonly states: Record<string, LearnerBiteState>;
  readonly streak: number;
  readonly lastStudyDate: string | null;
  readonly updatedAt: string | null;
};

// A person receiving daily reminders.
export type LearnerSubscription = {
  readonly _id: number; // Telegram chat id
  readonly isActive: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

// One reminder sent for a given local day + slot. Tracks whether the user rated it,
// which gates whether the next slot is allowed to fire.
export type LearnerDelivery = {
  readonly _id?: string; // `${chatId}:${dateKey}:${slot}`
  readonly chatId: number;
  readonly dateKey: string; // YYYY-MM-DD (Asia/Jerusalem)
  readonly slot: number; // 0-based index into REMINDER_HOURS
  readonly biteId: string;
  readonly messageId: number | null;
  readonly answered: boolean;
  readonly rating: LearnerRating | null;
  readonly sentAt: Date;
  readonly answeredAt: Date | null;
  readonly expireAt: Date; // TTL anchor
};
