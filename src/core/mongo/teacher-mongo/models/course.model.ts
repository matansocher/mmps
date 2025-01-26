import type { ObjectId } from 'mongodb';

export enum CourseStatus {
  Pending = 'pending',
  Assigned = 'assigned',
  Completed = 'completed',
}

export interface CourseModel {
  readonly _id: ObjectId;
  readonly topic: string;
  threadId?: string;
  readonly status: CourseStatus;
  readonly lessonsCompleted?: number;
  readonly assignedAt?: Date;
  readonly completedAt?: Date;
  readonly createdAt: Date;
}
