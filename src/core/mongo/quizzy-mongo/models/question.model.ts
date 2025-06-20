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
  threadId?: string;
  status?: QuestionStatus;
  readonly answeredAt?: Date;
  readonly createdAt: Date;
}
