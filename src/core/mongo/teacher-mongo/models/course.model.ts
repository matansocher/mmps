import type { ObjectId } from 'mongodb';

export interface CourseModel {
  readonly _id: ObjectId;
  readonly topic: string;
  readonly createdBy?: number;
  readonly createdAt: Date;
}
