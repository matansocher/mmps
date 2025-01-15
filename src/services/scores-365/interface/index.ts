export interface Competition {
  readonly id: number;
  readonly name: string;
  readonly shortName: string;
  readonly nameForURL: string;
}

export interface ExpectedTeam {
  id: number;
  name: string;
  symbolicName: string;
  score: number;
  nameForURL: string;
  color: string;
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
    id: number;
    name: string;
    shortName: string;
  };
  readonly homeCompetitor: ExpectedTeam;
  readonly awayCompetitor: ExpectedTeam;
  readonly tvNetworks: ExpectedTvNetworks[];
}

export interface Team {
  id: number;
  name: string;
  symbolicName: string;
  score: number;
  nameForURL: string;
  color: string;
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
