export type CompetitionRef = {
  readonly id: number;
  readonly name: string;
  readonly icon?: string;
  readonly themeColor?: string;
};

export type TeamRef = {
  readonly id: number;
  readonly name: string;
  readonly symbolicName?: string;
};

export type MatchStatus = 'scheduled' | 'live' | 'finished';

export type MatchSummary = {
  readonly id: number;
  readonly home: TeamRef;
  readonly away: TeamRef;
  readonly status: MatchStatus;
  readonly minute?: number;
  readonly startTime: string;
  readonly score?: { readonly home: number; readonly away: number };
  readonly competitionId: number;
};

export type TodayResponse = {
  readonly date: string; // Format: "YYYY-MM-DD"
  readonly live: ReadonlyArray<MatchSummary>;
  readonly groups: ReadonlyArray<{
    readonly competition: CompetitionRef;
    readonly matches: ReadonlyArray<MatchSummary>;
  }>;
};

export type TableRow = {
  readonly rank: number;
  readonly team: TeamRef;
  readonly played: number;
  readonly goalDifference: number;
  readonly points: number;
  readonly zone: 'champions' | 'europe' | 'relegation' | null;
};

export type CompetitionDetailResponse = {
  readonly competition: CompetitionRef;
  readonly table: ReadonlyArray<TableRow>;
  readonly fixtures: ReadonlyArray<MatchSummary>;
};

export type CompetitionListItem = CompetitionRef & {
  readonly hasTable: boolean;
  readonly following: boolean;
};

export type CompetitionsListResponse = {
  readonly competitions: ReadonlyArray<CompetitionListItem>;
};

export type FollowUpdateBody = {
  readonly follow: boolean;
};

export type FollowUpdateResponse = {
  readonly following: boolean;
};

export type MatchSide = 'home' | 'away';

export type RoundInfo = {
  readonly competition?: string;
  readonly round?: string;
  readonly roundNumber?: number;
  readonly season?: number;
};

export type MatchEvent = {
  readonly minute: number;
  readonly addedTime?: number;
  readonly minuteDisplay?: string;
  readonly side: MatchSide;
  readonly isMajor: boolean;
  readonly typeId: number;
  readonly typeName: string;
  readonly subTypeName?: string;
  readonly playerName?: string;
  readonly extraPlayerNames?: ReadonlyArray<string>;
};

export type LineupPlayer = {
  readonly memberId: number;
  readonly athleteId: number;
  readonly name: string;
  readonly shortName?: string;
  readonly jerseyNumber?: number;
  readonly position?: string;
  readonly formationPosition?: string;
  readonly yardLine?: number;
  readonly yardSide?: number;
  readonly ranking?: number;
  readonly isStarting: boolean;
};

export type LineupSide = {
  readonly formation?: string;
  readonly status?: string;
  readonly starting: ReadonlyArray<LineupPlayer>;
  readonly bench: ReadonlyArray<LineupPlayer>;
};

export type MatchDetailResponse = {
  readonly match: MatchSummary;
  readonly venue?: string;
  readonly stage?: string;
  readonly channel?: string;
  readonly round?: RoundInfo;
  readonly events: ReadonlyArray<MatchEvent>;
  readonly homeLineup?: LineupSide;
  readonly awayLineup?: LineupSide;
};
