export type League = 'nba' | 'ucl' | 'wc' | 'euro';

export type SeedSide = {
  readonly seed: string;
  readonly seedNumber: number;
  readonly team: string;
  readonly wins: number;
};

export type Series = {
  readonly higherSeed: SeedSide;
  readonly lowerSeed: SeedSide;
  readonly result: string;
  readonly winner: string;
};

export type Round = {
  readonly round: string;
  readonly conference: 'Eastern' | 'Western' | null;
  readonly series: readonly Series[];
};

export type Playoffs = {
  readonly season: number;
  readonly league: string;
  readonly format: string;
  readonly champion: string;
  readonly runnerUp: string;
  readonly source: string;
  readonly rounds: readonly Round[];
};

// A single series flattened with its context, used by the bracket.
export type FlatSeries = {
  readonly season: number;
  readonly league: League;
  readonly round: string;
  readonly conference: 'Eastern' | 'Western' | null;
  readonly higherSeed: SeedSide;
  readonly lowerSeed: SeedSide;
  readonly winner: string;
  readonly result: string;
};
