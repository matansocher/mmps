import type { ObjectId } from 'mongodb';
import { z } from 'zod';
import { TELEGRAM_MAX_MESSAGE_LENGTH } from '@services/telegram';

export const CourseResponseSchema = z.object({
  text: z.string().max(TELEGRAM_MAX_MESSAGE_LENGTH).describe('The main course content text that will be displayed to the user'),
});

export const CourseSummarySchema = z.object({
  summary: z
    .string()
    .max(1000)
    .describe('A comprehensive summary of the course discussion, covering the main points and concepts learned. Should be 2-3 paragraphs that capture the essence of what was taught.'),
  keyTakeaways: z.array(z.string()).min(3).max(5).describe('3-5 key takeaways that the user should remember from this course. Each should be a concise, actionable insight or important concept.'),
});

export type CourseResponse = z.infer<typeof CourseResponseSchema>;

export type Course = {
  readonly _id: ObjectId;
  readonly topic: string;
  readonly createdBy?: number;
  readonly createdAt: Date;
};

export enum CourseParticipationStatus {
  Pending = 'pending',
  Assigned = 'assigned',
  Completed = 'completed',
}

export type SummaryDetails = {
  readonly topicTitle: string;
  readonly summary: string;
  readonly keyTakeaways: string[];
  readonly sentAt?: Date;
  readonly createdAt: Date;
};

export type CourseParticipation = {
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
};

export type UserPreferences = {
  readonly _id: ObjectId;
  readonly chatId: number;
  readonly isStopped: boolean;
  readonly createdAt: Date;
};
