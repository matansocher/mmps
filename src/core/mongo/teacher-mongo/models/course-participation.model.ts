import type { ObjectId } from 'mongodb';

export enum CourseParticipationStatus {
  Pending = 'pending',
  Assigned = 'assigned',
  Completed = 'completed',
}

export interface CourseParticipation {
  readonly _id: ObjectId;
  readonly courseId: string;
  readonly chatId: number;
  previousResponseId?: string;
  readonly status: CourseParticipationStatus;
  readonly lessonsCompleted?: number;
  readonly assignedAt?: Date;
  readonly completedAt?: Date;
  readonly createdAt: Date;
}
