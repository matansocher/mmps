import type { ObjectId } from 'mongodb';

export enum CourseParticipationStatus {
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

export interface CourseParticipation {
  readonly _id: ObjectId;
  readonly courseId: string;
  readonly chatId: number;
  previousResponseId?: string;
  readonly status: CourseParticipationStatus;
  readonly lessonsCompleted?: number;
  readonly threadMessages?: number[];
  readonly summaryDetails?: SummaryDetails;
  readonly assignedAt?: Date;
  readonly completedAt?: Date;
  readonly createdAt: Date;
}
