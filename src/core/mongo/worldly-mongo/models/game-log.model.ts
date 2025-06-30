import type { ObjectId } from 'mongodb';

export interface GameLog {
  readonly _id: ObjectId;
  readonly chatId: number;
  readonly gameId: string;
  readonly type: string;
  readonly correct: string;
  readonly selected: string;
  readonly createdAt: Date;
  readonly answeredAt?: Date;
}
