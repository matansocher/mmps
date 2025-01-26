import type { ObjectId } from 'mongodb';

export interface UserPreferencesModel {
  readonly _id: ObjectId;
  readonly userId: number;
  readonly isStopped: boolean;
  readonly createdAt: Date;
}
