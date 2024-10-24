import type { ObjectId } from 'mongodb';

export interface ThreadModel {
  _id: ObjectId;
  threadId: number;
  isActive: boolean;
  createdAt: Date;
}
