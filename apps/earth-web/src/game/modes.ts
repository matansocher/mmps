import type { CameraView, Country } from '../types';
import { MIN_QUESTION_AREA_KM2 } from './countries';

export const CONTINENTS = ['Africa', 'Asia', 'Europe', 'North America', 'South America', 'Oceania'] as const;

export type Continent = (typeof CONTINENTS)[number];

export type GameMode = { readonly kind: 'classic' } | { readonly kind: 'time-attack' } | { readonly kind: 'continent'; readonly continent: Continent } | { readonly kind: 'neighbours' };

export const CONTINENT_VIEWS: Record<Continent, CameraView> = {
  Africa: { lat: 2, lon: 20, altitude: 11_000_000, heading: 0, pitch: -90 },
  Asia: { lat: 35, lon: 90, altitude: 13_000_000, heading: 0, pitch: -90 },
  Europe: { lat: 52, lon: 15, altitude: 6_500_000, heading: 0, pitch: -90 },
  'North America': { lat: 35, lon: -95, altitude: 11_000_000, heading: 0, pitch: -90 },
  'South America': { lat: -18, lon: -60, altitude: 10_000_000, heading: 0, pitch: -90 },
  Oceania: { lat: -22, lon: 150, altitude: 9_000_000, heading: 0, pitch: -90 },
};

// Countries with fewer neighbours make for a dull question (one click and done).
export const MIN_NEIGHBOURS = 2;

const askable = (country: Country) => country.area >= MIN_QUESTION_AREA_KM2;

export function questionPool(countries: readonly Country[], mode: GameMode): Country[] {
  switch (mode.kind) {
    case 'classic':
    case 'time-attack':
      return countries.filter(askable);
    case 'continent':
      return countries.filter((country) => askable(country) && country.continent === mode.continent);
    case 'neighbours':
      return countries.filter((country) => askable(country) && country.neighbours.length >= MIN_NEIGHBOURS);
  }
}

export const bestScoreKey = (mode: GameMode): string => (mode.kind === 'continent' ? `best:continent:${mode.continent}` : `best:${mode.kind}`);

export function modeTitle(mode: GameMode): string {
  switch (mode.kind) {
    case 'classic':
      return 'Classic';
    case 'time-attack':
      return 'Time Attack';
    case 'continent':
      return mode.continent;
    case 'neighbours':
      return 'Neighbours';
  }
}
