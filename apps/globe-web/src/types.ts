import type { Feature, MultiPolygon, Polygon } from 'geojson';

export type Continent = 'Asia' | 'Europe' | 'Africa' | 'North America' | 'South America' | 'Oceania';

export type Country = {
  readonly name: string;
  readonly alpha2: string;
  readonly alpha3: string;
  readonly lat: number;
  readonly lon: number;
  readonly capital: string;
  readonly continent: Continent;
  readonly emoji: string;
  readonly geometry: Polygon | MultiPolygon;
};

export type CountryProperties = {
  readonly alpha3: string;
  readonly name: string;
};

export type CountryFeature = Feature<Polygon | MultiPolygon, CountryProperties>;

export type GameStatus = 'start' | 'playing' | 'roundEnd';

// Hot/cold feedback bucket for a wrong guess, derived from distance to the target.
export type HintTemperature = 'boiling' | 'hot' | 'warm' | 'cold' | 'freezing';

export type MissHint = {
  readonly distanceKm: number;
  readonly temperature: HintTemperature;
  readonly guessedName: string;
};

export type GameState = {
  readonly status: GameStatus;
  // The 10 countries chosen for this round, in order.
  readonly queue: readonly Country[];
  // Index into queue of the current target.
  readonly index: number;
  readonly score: number; // first-try correct count
  readonly solved: number; // total solved (any number of tries)
  // Misses on the current target only.
  readonly currentMisses: number;
  // alpha3 of the country to flash red (cleared shortly after).
  readonly lastWrongAlpha3: string | null;
  // alpha3 of the last correctly guessed country (flash green).
  readonly lastCorrectAlpha3: string | null;
  readonly hint: MissHint | null;
};

export const ROUND_SIZE = 10;
