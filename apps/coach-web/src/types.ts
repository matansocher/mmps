export type EventType = 'goal' | 'redCard' | 'yellowCard' | 'missedPenalty' | 'var' | 'woodwork' | 'substitution';
export type GameStatus = 'live' | 'scheduled' | 'finished' | 'other';
export type Side = 'home' | 'away';
export type StatPair = readonly [string, string];
export type FormResult = 'W' | 'D' | 'L';

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
  readonly playerAthleteId?: number;
  readonly assistName?: string;
  readonly assistAthleteId?: number;
  readonly detail?: string;
  readonly ownGoal?: boolean;
};

export type Game = {
  readonly id: number;
  readonly competitionId: number;
  readonly competitionName: string;
  readonly startTime: string;
  readonly status: GameStatus;
  readonly statusText: string;
  readonly minuteDisplay?: string;
  readonly minute?: number;
  readonly home: Team;
  readonly away: Team;
  readonly isFavorite: boolean;
  readonly lineupsConfirmed: boolean;
  readonly channels: TvChannel[];
  readonly events: GameEvent[];
  readonly stats?: GameStats;
  readonly form?: DashboardForm;
  readonly headline?: GameHeadline;
};

export type FormEntry = { readonly result: FormResult; readonly opponent: string; readonly score: string };

// Oldest first, so the latest result is on the right.
export type DashboardForm = { readonly home: FormEntry[]; readonly away: FormEntry[] };

export type FavoriteTeam = { readonly id: number; readonly name: string };

export type Language = 'he' | 'en';

export type Preferences = {
  readonly competitionIds: number[];
  readonly favoriteTeams: FavoriteTeam[];
  readonly eventTypes: EventType[];
  readonly language: Language;
};

export type DashboardResponse = {
  readonly date: string;
  readonly updatedAt: string;
  readonly preferences: Preferences;
  readonly games: Game[];
};

export type CompetitionOption = { readonly id: number; readonly name: string; readonly icon: string };
export type TeamOption = { readonly id: number; readonly name: string };

export type NamedValue = { readonly name: string; readonly value: string };

export type GameStatRow = { readonly id: number; readonly name: string; readonly home: string; readonly away: string; readonly isMajor: boolean };

export type LineupPlayer = {
  readonly athleteId?: number;
  readonly name: string;
  readonly shortName?: string;
  readonly jerseyNumber?: number;
  readonly position?: string;
  readonly rating?: number;
  readonly fieldLine?: number;
  readonly fieldSide?: number;
  readonly subbedOffAt?: number;
  readonly subbedOnAt?: number;
  readonly stats: NamedValue[];
};

export type TeamLineup = {
  readonly status?: string;
  readonly formation?: string;
  readonly starting: LineupPlayer[];
  readonly bench: LineupPlayer[];
  readonly missing: LineupPlayer[];
  readonly coach?: string;
};

export type GameDetail = {
  readonly game: Game;
  readonly venue?: string;
  readonly referee?: string;
  readonly round?: string;
  readonly hasStandings: boolean;
  readonly halftimeScore?: readonly [number, number];
  readonly timeline: GameEvent[];
  readonly stats: GameStatRow[];
  readonly lineups?: { readonly home: TeamLineup; readonly away: TeamLineup };
  readonly headToHead?: HeadToHead;
};

export type HeadToHead = {
  readonly record: { readonly homeWins: number; readonly draws: number; readonly awayWins: number };
  readonly meetings: GameSummary[];
  readonly homeRecent: GameSummary[];
  readonly awayRecent: GameSummary[];
};

export type GameSummary = {
  readonly id: number;
  readonly competitionId: number;
  readonly competitionName: string;
  readonly startTime: string;
  readonly status: GameStatus;
  readonly statusText: string;
  readonly home: Team;
  readonly away: Team;
  readonly result?: FormResult;
};

export type SquadPlayer = { readonly athleteId: number; readonly name: string; readonly jerseyNumber?: number; readonly age?: number; readonly position: string };

export type TeamDetail = {
  readonly id: number;
  readonly name: string;
  readonly longName?: string;
  readonly color?: string;
  readonly mainCompetitionId?: number;
  readonly mainCompetitionName?: string;
  readonly recent: GameSummary[];
  readonly upcoming: GameSummary[];
  readonly squad: SquadPlayer[];
};

export type PlayerDetail = {
  readonly id: number;
  readonly name: string;
  readonly position?: string;
  readonly jerseyNumber?: number;
  readonly age?: number;
  readonly nationality?: string;
  readonly clubId?: number;
  readonly contractUntil?: string;
  readonly bio?: string;
  readonly details: { readonly title: string; readonly value: string }[];
  readonly seasonStats: { readonly competitionName: string; readonly stats: NamedValue[] }[];
  readonly recentGames: (GameSummary & { readonly stats: NamedValue[] })[];
};

export type StandingsRow = {
  readonly position: number;
  readonly team: { readonly id: number; readonly name: string };
  readonly played: number;
  readonly won: number;
  readonly drawn: number;
  readonly lost: number;
  readonly goalsFor: number;
  readonly goalsAgainst: number;
  readonly points: number;
  readonly form: FormResult[];
  readonly zoneColor?: string;
  readonly isLive: boolean;
  readonly liveGameId?: number;
  // Position change caused by games in play: 1 = moved up, -1 = moved down.
  readonly trend: number;
};

export type StandingsTable = { readonly name?: string; readonly rows: StandingsRow[] };

export type KnockoutLeg = {
  readonly gameId: number;
  readonly startTime?: string;
  readonly status: GameStatus;
  readonly homeId?: number;
  readonly homeScore?: number;
  readonly awayScore?: number;
};

export type KnockoutMatchup = {
  readonly teams: { readonly id: number; readonly name: string; readonly isQualified: boolean }[];
  readonly aggregate?: readonly [number, number];
  readonly legs: KnockoutLeg[];
};

export type KnockoutStage = { readonly name: string; readonly matchups: KnockoutMatchup[] };

export type CompetitionDetail = {
  readonly id: number;
  readonly name: string;
  readonly icon: string;
  readonly tables: StandingsTable[];
  readonly zones: { readonly name: string; readonly color: string }[];
  readonly knockout: KnockoutStage[];
  readonly matchdays: Matchday[];
};

export type Matchday = {
  readonly roundNum: number;
  readonly kind: 'previous' | 'current' | 'next';
  readonly games: GameSummary[];
};

export type TvChannel = {
  readonly id: number;
  readonly name: string;
};

export type GameHeadlineType = 'champions' | 'relegated' | 'top' | 'lostTop' | 'zoneIn' | 'zoneOut' | 'dangerIn' | 'dangerOut' | 'moveUp' | 'qualified';

export type GameHeadline = {
  readonly type: GameHeadlineType;
  readonly teamId: number;
  readonly position?: number;
  readonly zone?: string;
};
