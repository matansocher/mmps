export interface Competition {
  readonly id: string;
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
}

export interface Team {
  id: number;
  name: string;
  symbolicName: string;
  score: number;
  nameForURL: string;
}

export interface MatchDetails {
  readonly id: number;
  readonly startTime: string;
  readonly statusText: string;
  readonly gameTime: number;
  readonly venue: string;
  readonly homeCompetitor: Team;
  readonly awayCompetitor: Team;
}
