import type { ObjectId } from 'mongodb';

export interface UserPreferencesModel {
  _id: ObjectId;
  userId: number;
  isStopped: boolean;
  createdAt: Date;
}
