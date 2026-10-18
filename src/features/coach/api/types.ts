import type { DashboardEventType, DashboardFavoriteTeam, DashboardLanguage } from '@shared/coach';

export type DashboardGameStatus = 'live' | 'scheduled' | 'finished' | 'other';
export type DashboardSide = 'home' | 'away';
export type DashboardStatPair = readonly [string, string];

export type DashboardTeam = {
  readonly winProbability?: number;
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
  readonly playerAthleteId?: number;
  // For goals this is the assist; for substitutions it is the player who went off.
  readonly assistName?: string;
  readonly assistAthleteId?: number;
  readonly detail?: string;
  readonly ownGoal?: boolean;
};

export type DashboardFormEntry = {
  readonly result: FormResult;
  readonly opponent: string;
  // From the team's point of view, e.g. "2-1".
  readonly score: string;
};

// Oldest first, so the latest result is on the right.
export type DashboardForm = {
  readonly home: DashboardFormEntry[];
  readonly away: DashboardFormEntry[];
};

export type DashboardGame = {
  readonly id: number;
  readonly competitionId: number;
  readonly competitionName: string;
  readonly startTime: string;
  readonly status: DashboardGameStatus;
  readonly statusText: string;
  readonly minuteDisplay?: string;
  // Numeric game clock for live games (45 at half-time), used to place the timeline.
  readonly minute?: number;
  readonly home: DashboardTeam;
  readonly away: DashboardTeam;
  readonly isFavorite: boolean;
  readonly channels: TvChannel[];
  readonly lineupsConfirmed: boolean;
  readonly events: DashboardEvent[];
  readonly stats?: DashboardStats;
  readonly form?: DashboardForm;
  readonly headline?: GameHeadline;
  // Both teams' rows in the league table, for upcoming league games.
  readonly standings?: DashboardStandings;
};

export type DashboardStandingRow = Pick<StandingsRow, 'position' | 'played' | 'points' | 'zoneColor'> & { readonly goalDiff: number };

export type DashboardStandings = { readonly home: DashboardStandingRow; readonly away: DashboardStandingRow };

export type GameHeadlineType = 'champions' | 'relegated' | 'top' | 'lostTop' | 'zoneIn' | 'zoneOut' | 'dangerIn' | 'dangerOut' | 'moveUp' | 'qualified';

// What a finished game changed for one of its teams; the client turns it into a sentence.
export type GameHeadline = {
  readonly type: GameHeadlineType;
  readonly teamId: number;
  readonly position?: number;
  readonly zone?: string;
};

export type DashboardPreferencesDto = {
  readonly competitionIds: number[];
  readonly favoriteTeams: DashboardFavoriteTeam[];
  readonly eventTypes: DashboardEventType[];
  readonly language: DashboardLanguage;
};

export type DashboardResponse = {
  // Format: "YYYY-MM-DD" (Asia/Jerusalem) for both
  readonly date: string;
  readonly today: string;
  readonly updatedAt: string;
  readonly preferences: DashboardPreferencesDto;
  readonly games: DashboardGame[];
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

export type GameStatRow = {
  readonly id: number;
  readonly name: string;
  readonly home: string;
  readonly away: string;
  readonly isMajor: boolean;
};

export type LineupPlayer = {
  readonly athleteId?: number;
  readonly name: string;
  readonly shortName?: string;
  readonly jerseyNumber?: number;
  readonly position?: string;
  readonly rating?: number;
  // 0-100 from own goal line to opponent goal line, and 0-100 across the pitch.
  readonly fieldLine?: number;
  readonly fieldSide?: number;
  readonly subbedOffAt?: number;
  readonly subbedOnAt?: number;
  readonly stats: { readonly name: string; readonly value: string }[];
};

export type TeamLineup = {
  readonly status?: string;
  readonly formation?: string;
  readonly starting: LineupPlayer[];
  readonly bench: LineupPlayer[];
  readonly missing: LineupPlayer[];
  readonly coach?: string;
};

export type GameDetailResponse = {
  readonly game: DashboardGame;
  readonly venue?: string;
  readonly referee?: string;
  readonly round?: string;
  readonly hasStandings: boolean;
  readonly halftimeScore?: readonly [number, number];
  readonly timeline: DashboardEvent[];
  readonly stats: GameStatRow[];
  readonly lineups?: { readonly home: TeamLineup; readonly away: TeamLineup };
  readonly headToHead?: HeadToHead;
};

export type HeadToHead = {
  readonly record: { readonly homeWins: number; readonly draws: number; readonly awayWins: number };
  // Results are from the current home team's point of view.
  readonly meetings: GameSummary[];
  readonly homeRecent: GameSummary[];
  readonly awayRecent: GameSummary[];
};

export type FormResult = 'W' | 'D' | 'L';

export type GameSummary = {
  readonly id: number;
  readonly competitionId: number;
  readonly competitionName: string;
  readonly startTime: string;
  readonly status: DashboardGameStatus;
  readonly statusText: string;
  readonly home: DashboardTeam;
  readonly away: DashboardTeam;
  readonly result?: FormResult;
};

export type SquadPlayer = {
  readonly athleteId: number;
  readonly name: string;
  readonly jerseyNumber?: number;
  readonly age?: number;
  readonly position: string;
};

export type TeamDetailResponse = {
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

export type PlayerDetailResponse = {
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
  readonly seasonStats: { readonly competitionName: string; readonly stats: { readonly name: string; readonly value: string }[] }[];
  readonly recentGames: (GameSummary & { readonly stats: { readonly name: string; readonly value: string }[] })[];
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
  // Position change caused by live games: 1 = up, -1 = down, 0 = unchanged.
  readonly trend: number;
};

export type StandingsTable = {
  readonly name?: string;
  readonly rows: StandingsRow[];
};

export type KnockoutMatchup = {
  readonly teams: { readonly id: number; readonly name: string; readonly isQualified: boolean }[];
  readonly aggregate?: readonly [number, number];
  readonly legs: { readonly gameId: number; readonly startTime?: string; readonly status: DashboardGameStatus; readonly homeId?: number; readonly homeScore?: number; readonly awayScore?: number }[];
};

export type KnockoutStage = {
  readonly name: string;
  readonly matchups: KnockoutMatchup[];
};

export type CompetitionDetailResponse = {
  readonly id: number;
  readonly name: string;
  readonly icon: string;
  readonly tables: StandingsTable[];
  readonly zones: { readonly name: string; readonly color: string }[];
  readonly knockout: KnockoutStage[];
  readonly matchdays: Matchday[];
};

// 'previous' = the last fully played round, 'current' = partly played, 'next' = not started yet.
export type MatchdayKind = 'previous' | 'current' | 'next';

export type Matchday = {
  readonly roundNum: number;
  readonly kind: MatchdayKind;
  readonly games: GameSummary[];
};

export type ApiError = { readonly error: string };

export type TvChannel = {
  readonly id: number;
  readonly name: string;
};
