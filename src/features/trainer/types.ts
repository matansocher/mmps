import type { ObjectId } from 'mongodb';

export interface UserPreferences {
  readonly _id: ObjectId;
  readonly chatId: number;
  readonly isStopped: boolean;
  readonly createdAt: Date;
}

export interface Exercise {
  readonly _id: ObjectId;
  readonly chatId: number;
  readonly createdAt: Date;
}
