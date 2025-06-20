import type { ObjectId } from 'mongodb';

export interface Course {
  readonly _id: ObjectId;
  readonly topic: string;
  readonly createdBy?: number;
  readonly createdAt: Date;
}
