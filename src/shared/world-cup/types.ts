import type { ObjectId } from 'mongodb';

export type WorldCupUser = {
  readonly _id?: ObjectId;
  readonly telegramUserId: number;
  readonly chatId: number;
  readonly firstName: string;
  readonly lastName?: string;
  readonly username?: string;
  readonly notificationsEnabled: boolean;
  readonly createdAt: Date;
};

export type Guess = {
  readonly _id?: ObjectId;
  readonly telegramUserId: number;
  readonly matchId: number;
  readonly home: number;
  readonly away: number;
  readonly matchdayKey: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

export type LeaderboardEntry = {
  readonly telegramUserId: number;
  readonly firstName: string;
  readonly lastName?: string;
  readonly username?: string;
  readonly points: number;
  readonly guessCount: number;
};
