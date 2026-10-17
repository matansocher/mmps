export type EventType = 'goal' | 'redCard' | 'yellowCard' | 'missedPenalty' | 'var' | 'woodwork' | 'substitution';
export type GameStatus = 'live' | 'scheduled' | 'finished' | 'other';
export type Side = 'home' | 'away';
export type StatPair = readonly [string, string];

export type Team = {
  readonly id: number;
  readonly name: string;
  readonly shortName?: string;
  readonly score: number | null;
};

export type GameStats = {
  readonly possession?: StatPair;
  readonly expectedGoals?: StatPair;
  readonly shotsOnTarget?: StatPair;
};

export type GameEvent = {
  readonly key: string;
  readonly gameId: number;
  readonly type: EventType;
  readonly minute: number;
  readonly minuteDisplay: string;
  readonly side: Side;
  readonly playerName?: string;
  readonly assistName?: string;
  readonly detail?: string;
};

export type Game = {
  readonly id: number;
  readonly competitionId: number;
  readonly competitionName: string;
  readonly startTime: string;
  readonly status: GameStatus;
  readonly statusText: string;
  readonly minuteDisplay?: string;
  readonly home: Team;
  readonly away: Team;
  readonly isFavorite: boolean;
  readonly events: GameEvent[];
  readonly stats?: GameStats;
};

export type FeedItem = GameEvent & {
  readonly competitionId: number;
  readonly competitionName: string;
  readonly home: Team;
  readonly away: Team;
  readonly gameStatus: GameStatus;
  readonly estimatedAt: string;
};

export type FavoriteTeam = { readonly id: number; readonly name: string };

export type Preferences = {
  readonly competitionIds: number[];
  readonly favoriteTeams: FavoriteTeam[];
  readonly eventTypes: EventType[];
};

export type DashboardResponse = {
  readonly date: string;
  readonly updatedAt: string;
  readonly preferences: Preferences;
  readonly games: Game[];
  readonly feed: FeedItem[];
};

export type CompetitionOption = { readonly id: number; readonly name: string; readonly icon: string };
export type TeamOption = { readonly id: number; readonly name: string };
