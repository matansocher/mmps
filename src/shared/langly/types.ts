import type { ObjectId } from 'mongodb';

export type UserPreferences = {
  readonly _id: ObjectId;
  readonly chatId: number;
  readonly isStopped: boolean;
  previousResponseId?: string;
  readonly createdAt: Date;
};
