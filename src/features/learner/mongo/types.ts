import type { ObjectId } from 'mongodb';

// Read lesson ids per course. { [courseId]: string[] }
export type ReadMap = Record<string, string[]>;

// One document per user, keyed by Telegram user id (chatId).
export type LearnerProgress = {
  readonly _id?: ObjectId;
  readonly chatId: number;
  readonly courses: ReadMap;
  readonly updatedAt: Date;
};
