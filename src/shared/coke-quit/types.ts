import type { ObjectId } from 'mongodb';

export type CokeQuitTracker = {
  readonly _id?: ObjectId;
  readonly chatId: number;
  readonly quitDate: Date;
  readonly currentStreak: number;
  readonly longestStreak: number;
  readonly totalCokeFreeNights: number;
  readonly slips: ReadonlyArray<{
    readonly date: Date;
  }>;
  readonly isActive: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

export type CokeQuitStats = {
  readonly currentStreak: number;
  readonly longestStreak: number;
  readonly totalCokeFreeNights: number;
  readonly slipCount: number;
  readonly lastSlipDate?: Date;
};
