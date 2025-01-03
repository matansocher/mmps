import type { ObjectId } from 'mongodb';

export enum CourseStatus {
  Pending = 'pending',
  Assigned = 'assigned',
  Completed = 'completed',
}

export interface CourseModel {
  _id: ObjectId;
  topic: string;
  threadId?: string;
  status: CourseStatus;
  lessonsCompleted?: number;
  assignedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
}
