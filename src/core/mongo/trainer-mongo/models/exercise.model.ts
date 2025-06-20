import type { ObjectId } from 'mongodb';

export interface Exercise {
  readonly _id: ObjectId;
  readonly chatId: number;
  readonly createdAt: Date;
}
