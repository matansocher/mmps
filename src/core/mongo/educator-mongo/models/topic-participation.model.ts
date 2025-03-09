import type { ObjectId } from 'mongodb';

export enum TopicParticipationStatus {
  Pending = 'pending',
  Assigned = 'assigned',
  Completed = 'completed',
}

export interface TopicParticipationModel {
  readonly _id: ObjectId;
  readonly topicId: string;
  readonly chatId: number;
  threadId?: string;
  readonly status: TopicParticipationStatus;
  readonly assignedAt?: Date;
  readonly completedAt?: Date;
  readonly createdAt: Date;
}
