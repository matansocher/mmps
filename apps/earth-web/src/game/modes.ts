import type { CameraView, Country } from '../types';
import { MIN_QUESTION_AREA_KM2 } from './countries';

export const CONTINENTS = ['Africa', 'Asia', 'Europe', 'North America', 'South America', 'Oceania'] as const;

export type Continent = (typeof CONTINENTS)[number];

export type GameMode =
  | { readonly kind: 'daily'; readonly day: string } // Format: "YYYY-MM-DD" (local)
  | { readonly kind: 'classic' }
  | { readonly kind: 'continent'; readonly continent: Continent }
  | { readonly kind: 'name-it' }
  | { readonly kind: 'cleanup'; readonly continent: Continent };

export const CONTINENT_VIEWS: Record<Continent, CameraView> = {
  Africa: { lat: 2, lon: 20, altitude: 11_000_000, heading: 0, pitch: -90 },
  Asia: { lat: 35, lon: 90, altitude: 13_000_000, heading: 0, pitch: -90 },
  Europe: { lat: 52, lon: 15, altitude: 6_500_000, heading: 0, pitch: -90 },
  'North America': { lat: 35, lon: -95, altitude: 11_000_000, heading: 0, pitch: -90 },
  'South America': { lat: -18, lon: -60, altitude: 10_000_000, heading: 0, pitch: -90 },
  Oceania: { lat: -22, lon: 150, altitude: 9_000_000, heading: 0, pitch: -90 },
};

const askable = (country: Country) => country.area >= MIN_QUESTION_AREA_KM2;

export function questionPool(countries: readonly Country[], mode: GameMode): Country[] {
  switch (mode.kind) {
    case 'daily':
    case 'classic':
    case 'name-it':
      return countries.filter(askable);
    case 'continent':
    case 'cleanup':
      return countries.filter((country) => askable(country) && country.continent === mode.continent);
  }
}

export function bestScoreKey(mode: GameMode): string {
  if (mode.kind === 'continent') return `best:continent:${mode.continent}`;
  if (mode.kind === 'cleanup') return `best:cleanup:${mode.continent}`;
  if (mode.kind === 'daily') return `best:daily:${mode.day}`;
  return `best:${mode.kind}`;
}

export function modeTitle(mode: GameMode): string {
  switch (mode.kind) {
    case 'daily':
      return 'Daily challenge';
    case 'classic':
      return 'Classic';
    case 'continent':
      return `${mode.continent} sprint`;
    case 'name-it':
      return 'Name it';
    case 'cleanup':
      return `${mode.continent} cleanup`;
  }
}
