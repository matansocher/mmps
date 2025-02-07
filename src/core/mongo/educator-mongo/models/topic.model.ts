import type { ObjectId } from 'mongodb';

export enum TopicStatus {
  Pending = 'pending',
  Assigned = 'assigned',
  Completed = 'completed',
}

export interface TopicModel {
  readonly _id: ObjectId;
  readonly title: string;
  threadId?: string;
  readonly status: TopicStatus;
  readonly assignedAt?: Date;
  readonly completedAt?: Date;
  readonly createdAt: Date;
}
