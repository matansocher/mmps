import type { ObjectId } from 'mongodb';

export enum DifficultyLevel {
  BEGINNER = 1,
  INTERMEDIATE = 2,
  ADVANCED = 3,
  NATIVE = 4,
}

export type UserPreferences = {
  readonly _id: ObjectId;
  readonly chatId: number;
  readonly isStopped: boolean;
  previousResponseId?: string;
  difficulty?: DifficultyLevel;
  readonly createdAt: Date;
};
