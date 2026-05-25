export type MatchStatus = 'scheduled' | 'live' | 'finished';

export type MatchDto = {
  id: number;
  startTime: string;
  status: MatchStatus;
  statusText: string;
  stage: string;
  venue: string;
  home: { id: number; name: string; flag: string; score: number };
  away: { id: number; name: string; flag: string; score: number };
  myGuess?: { home: number; away: number; points?: number };
};

export type LeaderboardEntry = {
  telegramUserId: number;
  firstName: string;
  lastName?: string;
  username?: string;
  displayName?: string;
  points: number;
  guessCount: number;
};

export type LeaderboardDto = {
  entries: LeaderboardEntry[];
  myRank?: number;
};

export type ProfileDto = {
  telegramUserId: number;
  firstName: string;
  displayName?: string;
  username?: string;
  totalPoints: number;
  guessCount: number;
  notificationsEnabled: boolean;
  stats?: UserStatsDto;
};

export type UserStatsDto = {
  accuracy: number;
  exactCount: number;
  gdCount: number;
  resultCount: number;
  wrongCount: number;
  currentStreak: number;
  bestStreak: number;
  bestTeam?: { name: string; flag: string; accuracy: number };
  worstTeam?: { name: string; flag: string; accuracy: number };
};

export type TeamStatRow = {
  name: string;
  homeValue: string;
  awayValue: string;
};

export type H2HDto = {
  teamStats: TeamStatRow[];
  gamesPlayed: string;
  communityPrediction: { home: number; draw: number; away: number };
};

export type GuessResponse = {
  success: boolean;
  guess: { matchId: number; home: number; away: number };
};

export type PlayerDto = {
  name: string;
  position: string;
  clubId: number;
  age: number;
  athleteId: number;
  imageVersion: number;
};

export type TeamDto = {
  id: number;
  name: string;
  flag: string;
  fifaRanking: number;
  group: string;
  coach: string;
  players?: PlayerDto[];
};

export type StandingsRow = {
  competitorId: number;
  name: string;
  imageVersion: number;
  groupNum: number;
  position: number;
  gamePlayed: number;
  gamesWon: number;
  gamesEven: number;
  gamesLost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  points: number;
};

export type GroupStandings = {
  num: number;
  name: string;
  rows: StandingsRow[];
};

export type MatchSide = 'home' | 'away';

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
  isStarting: boolean;
};

export type LineupSideData = {
  formation?: string;
  starting: LineupPlayer[];
  bench: LineupPlayer[];
};

export type MatchDetailResponse = {
  match: MatchDto;
  venue?: string;
  stage?: string;
  channel?: string;
  events: MatchEvent[];
  homeLineup?: LineupSideData;
  awayLineup?: LineupSideData;
};

export type PlayerStat = {
  playerName: string;
  teamName: string;
  teamFlag: string;
  count: number;
};

export type TournamentStats = {
  topScorers: PlayerStat[];
  topAssisters: PlayerStat[];
  topYellowCards: PlayerStat[];
  topRedCards: PlayerStat[];
};
