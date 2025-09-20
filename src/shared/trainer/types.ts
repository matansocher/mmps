import type { ObjectId } from 'mongodb';

export type UserPreferences = {
  readonly _id: ObjectId;
  readonly chatId: number;
  readonly isStopped: boolean;
  readonly createdAt: Date;
};

export type Exercise = {
  readonly _id: ObjectId;
  readonly chatId: number;
  readonly createdAt: Date;
};
