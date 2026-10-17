import type { DashboardEventType, DashboardFavoriteTeam } from '@shared/coach';

export type DashboardGameStatus = 'live' | 'scheduled' | 'finished' | 'other';
export type DashboardSide = 'home' | 'away';
export type DashboardStatPair = readonly [string, string];

export type DashboardTeam = {
  readonly id: number;
  readonly name: string;
  readonly shortName?: string;
  readonly score: number | null;
};

export type DashboardStats = {
  readonly possession?: DashboardStatPair;
  readonly expectedGoals?: DashboardStatPair;
  readonly shotsOnTarget?: DashboardStatPair;
};

export type DashboardEvent = {
  readonly key: string;
  readonly gameId: number;
  readonly type: DashboardEventType;
  readonly minute: number;
  readonly minuteDisplay: string;
  readonly side: DashboardSide;
  readonly playerName?: string;
  readonly assistName?: string;
  readonly detail?: string;
};

export type DashboardGame = {
  readonly id: number;
  readonly competitionId: number;
  readonly competitionName: string;
  readonly startTime: string;
  readonly status: DashboardGameStatus;
  readonly statusText: string;
  readonly minuteDisplay?: string;
  readonly home: DashboardTeam;
  readonly away: DashboardTeam;
  readonly isFavorite: boolean;
  readonly events: DashboardEvent[];
  readonly stats?: DashboardStats;
};

export type DashboardFeedItem = DashboardEvent & {
  readonly competitionId: number;
  readonly competitionName: string;
  readonly home: DashboardTeam;
  readonly away: DashboardTeam;
  readonly gameStatus: DashboardGameStatus;
  readonly estimatedAt: string;
};

export type DashboardPreferencesDto = {
  readonly competitionIds: number[];
  readonly favoriteTeams: DashboardFavoriteTeam[];
  readonly eventTypes: DashboardEventType[];
};

export type DashboardResponse = {
  readonly date: string;
  readonly updatedAt: string;
  readonly preferences: DashboardPreferencesDto;
  readonly games: DashboardGame[];
  readonly feed: DashboardFeedItem[];
};

export type CompetitionOption = {
  readonly id: number;
  readonly name: string;
  readonly icon: string;
};

export type TeamOption = {
  readonly id: number;
  readonly name: string;
};

export type ApiError = { readonly error: string };
