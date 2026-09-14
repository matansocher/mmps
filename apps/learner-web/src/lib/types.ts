export type GuideId = 'system-design' | 'ai-engineering';

export type GuideMeta = {
  readonly label: string;
  readonly icon: string;
};

export type Bite = {
  readonly id: string;
  readonly guide: GuideId;
  readonly sectionId: string;
  readonly title: string;
  readonly subtitle: string;
  readonly minutes: number;
  readonly isReference: boolean;
  readonly html: string;
};

export type QuizQuestion = {
  readonly biteId: string;
  readonly question: string;
  readonly options: ReadonlyArray<string>;
  readonly answerIndex: number;
  readonly explanation: string;
};

// How the learner rated their recall of a bite.
export type Rating = 'got_it' | 'fuzzy' | 'nope';

// Per-bite learning state persisted per user (SM-2-lite spaced repetition).
export type BiteState = {
  readonly biteId: string;
  // 'new' -> never studied; 'learning' -> studied at least once; 'done' means seen + rated got_it.
  readonly rating: Rating | null;
  readonly readAt: string | null; // ISO timestamp of last read
  readonly dueAt: string | null; // ISO timestamp when it should resurface for review
  readonly reps: number; // number of times rated
  readonly gotItStreak?: number; // consecutive 'got_it' ratings; drives interval growth, resets on any lapse
  readonly quizPassed: boolean;
};

export type LearnerProgress = {
  readonly states: Record<string, BiteState>;
  readonly streak: number;
  readonly lastStudyDate: string | null; // YYYY-MM-DD (Asia/Jerusalem)
  readonly updatedAt: string | null;
};
