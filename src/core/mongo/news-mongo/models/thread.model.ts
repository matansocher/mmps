import type { ObjectId } from 'mongodb';

export interface ThreadModel {
  _id: ObjectId;
  threadId: string;
  isActive: boolean;
  createdAt: Date;
}
