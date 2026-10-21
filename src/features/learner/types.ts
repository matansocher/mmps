import type { ObjectId } from 'mongodb';

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

export type PracticeDifficulty = 'easy' | 'medium' | 'hard';

// One hand-written open question from a lesson's "Interview Q&A" block (see learner-questions.ts).
export type LearnerQuestion = {
  readonly id: string; // `${biteId}#q${n}`
  readonly biteId: string;
  readonly guide: GuideId;
  readonly lessonTitle: string;
  readonly question: string;
  readonly referenceAnswer: string;
  readonly difficulty: PracticeDifficulty; // Orders each lesson easy → hard (see learner-question-difficulty.ts).
};

export type PracticeScope =
  | { readonly kind: 'all'; readonly readOnly?: boolean }
  | { readonly kind: 'guides'; readonly guides: readonly GuideId[]; readonly readOnly?: boolean }
  | { readonly kind: 'lessons'; readonly biteIds: readonly string[] };

export type PracticeVerdict = 'correct' | 'partial' | 'incorrect';

export type PracticeGrade = {
  readonly score: number; // 0-100
  readonly verdict: PracticeVerdict;
  readonly coveredPoints: readonly string[];
  readonly missedPoints: readonly string[];
  readonly incorrectClaims: readonly string[];
  readonly explanation: string;
  readonly referenceAnswer: string;
  readonly skipped: boolean;
};

export type PracticeAnswerSource = 'text' | 'voice';

export type PracticeMessage = {
  readonly role: 'user' | 'assistant';
  readonly content: string;
  readonly createdAt: Date;
};

export type PracticeAttempt = {
  readonly _id?: ObjectId;
  readonly telegramUserId: number;
  readonly questionId: string;
  readonly biteId: string;
  readonly scope: PracticeScope;
  readonly status: 'awaiting_answer' | 'graded';
  readonly answer?: string;
  readonly answerSource?: PracticeAnswerSource;
  readonly grade?: PracticeGrade;
  readonly messages: readonly PracticeMessage[];
  readonly createdAt: Date;
  readonly gradedAt?: Date;
};

export type PracticeQuestionStats = {
  readonly _id: string; // `${telegramUserId}:${questionId}`
  readonly telegramUserId: number;
  readonly questionId: string;
  readonly biteId: string;
  readonly attempts: number;
  readonly lastScore: number;
  readonly bestScore: number;
  readonly streak: number; // consecutive scores >= 80
  readonly lastAttemptAt: Date;
  readonly dueAt: Date;
};
