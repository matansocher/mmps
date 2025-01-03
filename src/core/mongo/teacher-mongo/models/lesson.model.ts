import type { ObjectId } from 'mongodb';

export enum LessonStatus {
  Pending = 'pending',
  Assigned = 'assigned',
  Completed = 'completed',
}

export interface LessonModel {
  _id: ObjectId;
  topic: string;
  threadId?: string;
  status: LessonStatus;
  partsCompleted?: number;
  assignedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
}
