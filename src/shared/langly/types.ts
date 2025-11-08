import type { ObjectId } from 'mongodb';


export enum DifficultyLevel {
  BEGINNER = 1,
  INTERMEDIATE = 2,
  ADVANCED = 3,
  NATIVE = 4,
}

export const Language = {
  HEBREW: 'hebrew',
  ENGLISH: 'english',
  SPANISH: 'spanish',
  FRENCH: 'french',
  ARABIC: 'arabic',
} as const;

export type Language = (typeof Language)[keyof typeof Language];

export type UserPreferences = {
  readonly _id: ObjectId;
  readonly chatId: number;
  readonly isStopped: boolean;
  previousResponseId?: string;
  difficulty?: DifficultyLevel;
  language?: Language;
  readonly createdAt: Date;
};
