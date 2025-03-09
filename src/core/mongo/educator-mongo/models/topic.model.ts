import type { ObjectId } from 'mongodb';

export interface TopicModel {
  readonly _id: ObjectId;
  readonly title: string;
  readonly createdBy?: number;
  readonly createdAt: Date;
}
