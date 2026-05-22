export type MatchStatus = 'scheduled' | 'live' | 'finished';

export type MatchDto = {
  id: number;
  startTime: string;
  status: MatchStatus;
  statusText: string;
  stage: string;
  venue: string;
  home: { name: string; flag: string; score: number };
  away: { name: string; flag: string; score: number };
  myGuess?: { home: number; away: number; points?: number };
};

export type LeaderboardEntry = {
  telegramUserId: number;
  firstName: string;
  lastName?: string;
  username?: string;
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
  username?: string;
  totalPoints: number;
  guessCount: number;
  notificationsEnabled: boolean;
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
