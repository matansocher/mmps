import type { ObjectId } from 'mongodb';
import { z } from 'zod';
import { TELEGRAM_MAX_MESSAGE_LENGTH } from '@services/telegram';

export const LessonResponseSchema = z.object({
  text: z.string().max(TELEGRAM_MAX_MESSAGE_LENGTH).describe('The lesson content text that will be displayed to the user'),
});

export const LessonCountAnalysisSchema = z.object({
  recommendedLessonCount: z.number().min(1).max(50).describe('The recommended number of lessons based on material volume and complexity'),
  rationale: z.string().max(500).describe('Brief explanation of why this lesson count is appropriate'),
  estimatedTokens: z.number().describe('Estimated total tokens in the material'),
  lessonOutlines: z.array(
    z.object({
      lessonNumber: z.number().describe('The lesson number'),
      topics: z.array(z.string()).describe('Main topics covered in this lesson'),
      suggestedChunkIndexes: z.array(z.number()).describe('Indexes of chunks most relevant to this lesson'),
    }),
  ).describe('Structured outline for each lesson with topics and relevant chunk indexes'),
});

export const CourseSummarySchema = z.object({
  summary: z.string().max(2000).describe('A comprehensive summary of the entire course, covering main points and concepts learned. Should be 2-3 paragraphs capturing the essence of what was taught.'),
  keyTakeaways: z.array(z.string()).min(5).max(7).describe('5-7 key takeaways that the user should remember from this course. Each should be a concise, actionable insight or important concept.'),
  practicalApplications: z.array(z.string()).min(2).max(4).describe('2-4 practical ways to apply what was learned'),
  nextSteps: z.array(z.string()).min(2).max(3).describe('2-3 suggested next steps for deeper learning'),
});

export type LessonResponse = z.infer<typeof LessonResponseSchema>;
export type LessonCountAnalysis = z.infer<typeof LessonCountAnalysisSchema>;
export type CourseSummary = z.infer<typeof CourseSummarySchema>;

export type LessonOutline = {
  readonly lessonNumber: number;
  readonly topics: string[];
  readonly suggestedChunkIndexes: number[];
};

export type Course = {
  readonly _id: ObjectId;
  readonly topic: string;
  readonly materialSummary: string;
  readonly totalLessons: number;
  readonly estimatedTokens: number;
  readonly lessonOutlines?: LessonOutline[];
  readonly createdAt: Date;
};

export enum CourseParticipationStatus {
  Pending = 'pending',
  Active = 'active',
  Completed = 'completed',
}

export type SummaryDetails = {
  readonly topicTitle: string;
  readonly summary: string;
  readonly keyTakeaways: string[];
  readonly practicalApplications: string[];
  readonly nextSteps: string[];
  readonly sentAt?: Date;
  readonly createdAt: Date;
};

export type CourseParticipation = {
  readonly _id: ObjectId;
  readonly courseId: string;
  readonly chatId: number;
  previousResponseId?: string; // OpenAI thread ID for maintaining conversation context across lessons
  readonly status: CourseParticipationStatus;
  readonly totalLessons: number;
  readonly currentLesson: number;
  readonly lessonsCompleted: number;
  readonly lastLessonCompletedAt?: Date;
  readonly nextLessonAvailableAt?: Date;
  readonly isWaitingForNextLesson: boolean;
  readonly threadMessages?: number[]; // Telegram message IDs in this course thread
  readonly summaryDetails?: SummaryDetails;
  readonly assignedAt?: Date;
  readonly completedAt?: Date;
  readonly createdAt: Date;
};
