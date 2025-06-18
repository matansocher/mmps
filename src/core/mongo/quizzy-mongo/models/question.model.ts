import type { ObjectId } from 'mongodb';

export interface AnswerModel {
  readonly id: string;
  readonly text: string;
  readonly isCorrect: boolean;
}

export interface QuestionModel {
  readonly _id: ObjectId;
  readonly question: string;
  readonly answers: AnswerModel[];
  readonly createdAt: Date;
}
