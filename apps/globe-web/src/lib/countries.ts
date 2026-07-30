import type { FeatureCollection } from 'geojson';
import rawCountries from '../data/countries.json';
import type { Continent, Country, CountryFeature } from '../types';
import { ROUND_SIZE } from '../types';

// Only countries with polygon geometry can be drawn/clicked on the globe.
function hasGeometry(c: Partial<Country>): c is Country {
  return Boolean(c.geometry && (c.geometry.type === 'Polygon' || c.geometry.type === 'MultiPolygon'));
}

let cached: Country[] | null = null;

export function loadPlayableCountries(): Country[] {
  if (cached) return cached;
  cached = (rawCountries as unknown as Partial<Country>[]).filter(hasGeometry);
  return cached;
}

export function listContinents(countries: readonly Country[]): Continent[] {
  return [...new Set(countries.map((c) => c.continent))].sort() as Continent[];
}

export function toFeatureCollection(countries: readonly Country[]): FeatureCollection {
  const features: CountryFeature[] = countries.map((c) => ({
    type: 'Feature',
    properties: { alpha3: c.alpha3, name: c.name },
    geometry: c.geometry,
  }));
  return { type: 'FeatureCollection', features };
}

function shuffle<T>(items: readonly T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Pick a round of unique random countries, optionally restricted to one continent.
export function pickRoundCountries(pool: readonly Country[], continent?: Continent): Country[] {
  const filtered = continent ? pool.filter((c) => c.continent === continent) : pool;
  return shuffle(filtered).slice(0, Math.min(ROUND_SIZE, filtered.length));
}
