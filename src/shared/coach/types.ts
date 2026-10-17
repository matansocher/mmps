import type { ObjectId } from 'mongodb';

export type Subscription = {
  readonly _id: ObjectId;
  readonly chatId: number;
  readonly isActive: boolean;
  readonly customLeagues?: number[];
  readonly createdAt: Date;
};

export type DashboardEventType = 'goal' | 'redCard' | 'yellowCard' | 'missedPenalty' | 'var' | 'woodwork' | 'substitution';

export type DashboardLanguage = 'he' | 'en';

export type DashboardFavoriteTeam = {
  readonly id: number;
  readonly name: string;
};

export type DashboardPreferences = {
  readonly _id?: ObjectId;
  readonly telegramUserId: number;
  readonly competitionIds: number[];
  readonly favoriteTeams: DashboardFavoriteTeam[];
  readonly eventTypes: DashboardEventType[];
  readonly refreshIntervalSec?: number;
  readonly language?: DashboardLanguage;
  readonly accessToken?: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

export type DashboardPreferencesUpdate = Pick<DashboardPreferences, 'competitionIds' | 'favoriteTeams' | 'eventTypes' | 'refreshIntervalSec' | 'language'>;
