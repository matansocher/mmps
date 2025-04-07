export interface CompetitionDetails {
  readonly competition: Competition;
  readonly matches: MatchDetails[];
}

export interface Competition {
  readonly id: number;
  readonly name: string;
  readonly nameForURL: string;
}

export interface Competitor {
  readonly id: number;
  readonly name: string;
}

export interface ExpectedTeam {
  readonly id: number;
  readonly name: string;
  readonly symbolicName: string;
  readonly score: number;
  readonly nameForURL: string;
  readonly color: string;
}

export interface ExpectedTvNetworks {
  readonly id: number;
  readonly name: string;
}

export interface ExpectedMatch {
  readonly id: number;
  readonly startTime: string;
  readonly statusText: string;
  readonly gameTime: number;
  readonly venue: {
    readonly id: number;
    readonly name: string;
    readonly shortName: string;
  };
  readonly homeCompetitor: ExpectedTeam;
  readonly awayCompetitor: ExpectedTeam;
  readonly tvNetworks: ExpectedTvNetworks[];
}

export interface Team {
  readonly id: number;
  readonly name: string;
  readonly symbolicName: string;
  readonly score: number;
  readonly nameForURL: string;
  readonly color: string;
}

export interface MatchDetails {
  readonly id: number;
  readonly startTime: string;
  readonly statusText: string;
  readonly gameTime: number;
  readonly venue: string;
  readonly homeCompetitor: Team;
  readonly awayCompetitor: Team;
  readonly channel: string;
}

export interface CompetitionTableDetails {
  readonly competition: Competition & { icon: string };
  readonly competitionTable: CompetitionTable[];
}

export interface CompetitionTable {
  readonly competitor: Competitor;
  readonly points: number;
  readonly position: number;
}
