export type CompetitionDetails = {
  readonly competition: Competition;
  readonly matches: MatchDetails[];
};

export type Competition = {
  readonly id: number;
  readonly name: string;
  readonly icon?: string;
  readonly hasTable?: boolean;
};

export type Competitor = {
  readonly id: number;
  readonly name: string;
};

export type ExpectedTeam = {
  readonly id: number;
  readonly name: string;
  readonly symbolicName: string;
  readonly score: number;
  readonly color: string;
};

export type ExpectedTvNetworks = {
  readonly id: number;
  readonly name: string;
};

export type ExpectedMatch = {
  readonly id: number;
  readonly startTime: string;
  readonly statusText: string;
  readonly gameTime: number;
  readonly stageName: string;
  readonly venue: {
    readonly id: number;
    readonly name: string;
    readonly shortName: string;
  };
  readonly homeCompetitor: ExpectedTeam;
  readonly awayCompetitor: ExpectedTeam;
  readonly tvNetworks: ExpectedTvNetworks[];
};

export type Team = {
  readonly id: number;
  readonly name: string;
  readonly symbolicName: string;
  readonly score: number;
  readonly color: string;
};

export type MatchDetails = {
  readonly id: number;
  readonly startTime: string;
  readonly statusText: string;
  readonly gameTime: number;
  readonly venue: string;
  readonly stage: string;
  readonly homeCompetitor: Team;
  readonly awayCompetitor: Team;
  readonly channel: string;
};

export type CompetitionTableDetails = {
  readonly competition: Competition & { icon: string };
  readonly competitionTable: CompetitionTableRow[];
};

export type CompetitionTableRow = {
  readonly competitor: Competitor;
  readonly points: number;
  readonly gamesPlayed: number;
};

export type AthleteGame = {
  readonly id: number;
  readonly startTime: string;
  readonly statusText: string;
  readonly homeCompetitor: Team;
  readonly awayCompetitor: Team;
  readonly gameTime: string;
  readonly venue: string;
  readonly playerStats: any;
};

export type AthleteLastMatches = {
  readonly games: AthleteGame[];
  readonly headers: any[];
};

export type AthleteData = {
  readonly id: number;
  readonly name: string;
  readonly lastMatches: AthleteLastMatches;
};

export type AthleteApiResponse = {
  readonly athletes: AthleteData[];
};
