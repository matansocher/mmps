export type CompetitionRef = {
  id: number;
  name: string;
  icon?: string;
  themeColor?: string;
};

export type TeamRef = {
  id: number;
  name: string;
  symbolicName?: string;
};

export type MatchStatus = 'scheduled' | 'live' | 'finished';

export type MatchSummary = {
  id: number;
  home: TeamRef;
  away: TeamRef;
  status: MatchStatus;
  minute?: number;
  startTime: string;
  score?: { home: number; away: number };
  competitionId: number;
};

export type TodayResponse = {
  date: string;
  live: MatchSummary[];
  groups: Array<{ competition: CompetitionRef; matches: MatchSummary[] }>;
};

export type TableRow = {
  rank: number;
  team: TeamRef;
  played: number;
  goalDifference: number;
  points: number;
  zone: 'champions' | 'europe' | 'relegation' | null;
};

export type StandingsTable = {
  groupName?: string;
  rows: TableRow[];
};

export type KnockoutParticipant = {
  id: number;
  name: string;
  symbolicName?: string;
  isQualified?: boolean;
};

export type KnockoutLeg = {
  gameId: number;
  num: number;
  homeCompetitorId?: number;
  awayCompetitorId?: number;
  homeScore?: number;
  awayScore?: number;
  statusText?: string;
  startTime?: string;
};

export type KnockoutMatchup = {
  participants: KnockoutParticipant[];
  score?: number[];
  legCount: number;
  gameId?: number;
  legs: KnockoutLeg[];
};

export type KnockoutStage = {
  num: number;
  name: string;
  matchups: KnockoutMatchup[];
};

export type CompetitionDetailResponse = {
  competition: CompetitionRef;
  tables: StandingsTable[];
  knockoutStages: KnockoutStage[];
  fixtures: MatchSummary[];
};

export type CompetitionListItem = CompetitionRef & {
  hasTable: boolean;
  following: boolean;
};

export type CompetitionsListResponse = {
  competitions: CompetitionListItem[];
};

export type FollowUpdateResponse = {
  following: boolean;
};

export type MatchDetailResponse = {
  match: MatchSummary;
  venue?: string;
  stage?: string;
  channel?: string;
  round?: RoundInfo;
  events: MatchEvent[];
  homeLineup?: LineupSide;
  awayLineup?: LineupSide;
};

export type MatchSide = 'home' | 'away';

export type RoundInfo = {
  competition?: string;
  round?: string;
  roundNumber?: number;
  season?: number;
};

export type MatchEvent = {
  minute: number;
  addedTime?: number;
  minuteDisplay?: string;
  side: MatchSide;
  isMajor: boolean;
  typeId: number;
  typeName: string;
  subTypeName?: string;
  playerName?: string;
  extraPlayerNames?: string[];
};

export type LineupPlayer = {
  memberId: number;
  athleteId: number;
  name: string;
  shortName?: string;
  jerseyNumber?: number;
  position?: string;
  formationPosition?: string;
  yardLine?: number;
  yardSide?: number;
  fieldLine?: number;
  ranking?: number;
  isStarting: boolean;
};

export type LineupSide = {
  formation?: string;
  status?: string;
  starting: LineupPlayer[];
  bench: LineupPlayer[];
};

export type SquadPlayer = {
  athleteId: number;
  name: string;
  position: string;
  positionName?: string;
  age?: number;
  jerseyNumber?: number;
  clubId?: number;
  imageVersion?: number;
};

export type TeamRecentMatch = MatchSummary & {
  outcome: 'W' | 'D' | 'L';
};

export type TeamDetailResponse = {
  team: TeamRef;
  country?: string;
  mainCompetitionId?: number;
  imageVersion?: number;
  color?: string;
  awayColor?: string;
  recentMatches: TeamRecentMatch[];
  squad: SquadPlayer[];
};

export type AthleteDetailResponse = {
  athleteId: number;
  name: string;
  position: string;
  positionName?: string;
  age?: number;
  height?: number;
  jerseyNumber?: number;
  nationalityName?: string;
  clubId?: number;
  clubName?: string;
  imageVersion?: number;
};
