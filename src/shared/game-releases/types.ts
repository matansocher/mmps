import type { ObjectId } from 'mongodb';
import type { ReleaseStatus } from '@services/igdb';

// A PS5 game the user follows until it releases.
export type GameFollow = {
  readonly _id?: ObjectId;
  readonly chatId: number;
  readonly igdbId: number;
  readonly name: string;
  readonly slug: string | null;
  readonly coverUrl: string | null;
  readonly releaseDate: Date | null; // null when the date is fuzzy or TBA
  readonly releaseHuman: string; // last known display string: "Sep 15, 2026" | "Q4 2026" | "TBA"
  readonly releaseStatus: ReleaseStatus;
  readonly isActive: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

export type CreateGameFollowData = Omit<GameFollow, '_id' | 'isActive' | 'createdAt' | 'updatedAt'>;

export type UpdateReleaseInfoData = Pick<GameFollow, 'name' | 'releaseDate' | 'releaseHuman' | 'releaseStatus'>;
