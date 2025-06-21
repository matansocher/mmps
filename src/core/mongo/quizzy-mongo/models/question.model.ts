import type { ObjectId } from 'mongodb';

export enum QuestionStatus {
  Assigned = 'assigned',
  Completed = 'completed',
}

export interface Answer {
  readonly id: string;
  readonly text: string;
  readonly isCorrect?: boolean;
}

export interface Question {
  readonly _id: ObjectId;
  readonly chatId: number;
  readonly question: string;
  readonly answers: Answer[];
  readonly threadId?: string;
  readonly status?: QuestionStatus;
  readonly revealMessageId?: number;
  readonly answeredAt?: Date;
  readonly createdAt: Date;
}
