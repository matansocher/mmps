import type { Country, LatLon } from '../types';
import { countryFocus } from './countries';
import { pickQuestions } from './quiz';

export const OPTION_COUNT = 4;
// Wrong answers are drawn from this many closest countries: hard, but not the same three every time.
const NEARBY = 6;
const EARTH_RADIUS_KM = 6371;

export function distanceKm(a: LatLon, b: LatLon): number {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLon = (b.lon - a.lon) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

// Bordering countries first, then the rest by distance between their main landmasses.
export function nearbyCountries(target: Country, candidates: readonly Country[], count: number): Country[] {
  const from = countryFocus(target);
  return candidates
    .filter((country) => country.code !== target.code)
    .map((country) => ({ country, border: target.neighbours.includes(country.code) ? 0 : 1, distance: distanceKm(from, countryFocus(country)) }))
    .sort((a, b) => a.border - b.border || a.distance - b.distance)
    .slice(0, count)
    .map(({ country }) => country);
}

export function nameItOptions(target: Country, candidates: readonly Country[], random: () => number = Math.random): string[] {
  const nearby = nearbyCountries(target, candidates, NEARBY).map((country) => country.code);
  return pickQuestions([target.code, ...pickQuestions(nearby, OPTION_COUNT - 1, random)], OPTION_COUNT, random);
}
