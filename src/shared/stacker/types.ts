import type { ObjectId } from 'mongodb';

export const TOPICS = {
  JAVASCRIPT: 'javascript',
  TYPESCRIPT: 'typescript',
  NODE: 'node',
  PYTHON: 'python',
  ALGORITHMS: 'algorithms',
  SQL: 'sql',
} as const;

export type Topic = (typeof TOPICS)[keyof typeof TOPICS];

export const LEVELS = {
  BEGINNER: 'beginner',
  INTERMEDIATE: 'intermediate',
  ADVANCED: 'advanced',
} as const;

export type Level = (typeof LEVELS)[keyof typeof LEVELS];

export const QUESTION_TYPES = {
  MULTIPLE_CHOICE: 'multiple_choice',
  CODE_OUTPUT: 'code_output',
  FILL_IN: 'fill_in',
} as const;

export type QuestionType = (typeof QUESTION_TYPES)[keyof typeof QUESTION_TYPES];

export const DEFAULT_NOTIFICATION_HOUR = 19;
export const DAILY_HEARTS = 3;
export const SESSION_SIZE = 5;

export type StackerUser = {
  readonly _id?: ObjectId;
  readonly chatId: number;
  readonly telegramUserId: number;
  readonly username?: string;
  readonly xp: number;
  readonly streakCount: number;
  readonly lastPlayedAt?: Date;
  readonly heartsRemaining: number;
  readonly heartsResetAt?: Date;
  readonly notificationHour: number;
  readonly notificationsEnabled: boolean;
  readonly skillLevels: Record<string, Level>;
  readonly createdAt: Date;
};

type BaseQuestion = {
  readonly _id?: ObjectId;
  readonly topic: Topic;
  readonly level: Level;
  readonly question: string;
  readonly explanation: string;
  readonly tags?: readonly string[];
};

export type MultipleChoiceQuestion = BaseQuestion & {
  readonly type: typeof QUESTION_TYPES.MULTIPLE_CHOICE;
  readonly options: readonly string[];
  readonly correctOptionIndex: number;
};

export type CodeOutputQuestion = BaseQuestion & {
  readonly type: typeof QUESTION_TYPES.CODE_OUTPUT;
  readonly codeSnippet: string;
  readonly options: readonly string[];
  readonly correctOptionIndex: number;
};

export type FillInQuestion = BaseQuestion & {
  readonly type: typeof QUESTION_TYPES.FILL_IN;
  readonly codeSnippet?: string;
  readonly acceptedAnswers: readonly string[];
};

export type Question = MultipleChoiceQuestion | CodeOutputQuestion | FillInQuestion;

export type SessionStatus = 'active' | 'completed' | 'abandoned';

export type Session = {
  readonly _id?: ObjectId;
  readonly chatId: number;
  readonly topic: Topic;
  readonly level: Level;
  readonly initialSize: number;
  readonly queue: readonly ObjectId[];
  readonly retakeQueue: readonly ObjectId[];
  readonly currentQuestionId?: ObjectId;
  readonly currentMessageId?: number;
  readonly correctCount: number;
  readonly wrongCount: number;
  readonly status: SessionStatus;
  readonly startedAt: Date;
  readonly endedAt?: Date;
};

export type AnswerLog = {
  readonly _id?: ObjectId;
  readonly chatId: number;
  readonly sessionId: ObjectId;
  readonly questionId: ObjectId;
  readonly correct: boolean;
  readonly answeredAt: Date;
};
