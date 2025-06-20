import type { ObjectId } from 'mongodb';

export interface GameLog {
  readonly _id: ObjectId;
  readonly chatId: number;
  readonly question: string;
  readonly correct: string;
  readonly selected: string;
  readonly createdAt: Date;
}
