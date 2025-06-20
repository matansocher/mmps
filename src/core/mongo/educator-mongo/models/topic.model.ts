import type { ObjectId } from 'mongodb';

export interface Topic {
  readonly _id: ObjectId;
  readonly title: string;
  readonly createdBy?: number;
  readonly createdAt: Date;
}
