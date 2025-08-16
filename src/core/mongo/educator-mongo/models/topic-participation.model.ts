import type { ObjectId } from 'mongodb';

export enum TopicParticipationStatus {
  Pending = 'pending',
  Assigned = 'assigned',
  Completed = 'completed',
}

export interface SummaryDetails {
  readonly topicTitle: string;
  readonly summary: string;
  readonly keyTakeaways: string[];
  readonly sentAt?: Date;
  readonly createdAt: Date;
}

export interface TopicParticipation {
  readonly _id: ObjectId;
  readonly topicId: string;
  readonly chatId: number;
  previousResponseId?: string;
  readonly status: TopicParticipationStatus;
  readonly threadMessages?: number[];
  readonly summaryDetails?: SummaryDetails;
  readonly assignedAt?: Date;
  readonly completedAt?: Date;
  readonly createdAt: Date;
}
