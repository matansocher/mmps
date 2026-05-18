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

export type CompetitionDetailResponse = {
  competition: CompetitionRef;
  table: TableRow[];
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
  ranking?: number;
  isStarting: boolean;
};

export type LineupSide = {
  formation?: string;
  status?: string;
  starting: LineupPlayer[];
  bench: LineupPlayer[];
};
