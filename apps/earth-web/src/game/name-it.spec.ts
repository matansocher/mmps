import { describe, expect, it } from 'vitest';
import type { Country } from '../types';
import { distanceKm, nameItOptions, nearbyCountries, OPTION_COUNT } from './name-it';

const square = (lon: number, lat: number) => [lon, lat, lon + 1, lat, lon + 1, lat + 1, lon, lat + 1];
const country = (code: string, lon: number, lat: number, neighbours: string[] = []): Country => ({
  code,
  name: code,
  flag: '',
  continent: 'Europe',
  area: 10_000,
  neighbours,
  polygons: [[square(lon, lat)]],
});

const TARGET = country('AA', 0, 0, ['FAR']);
const COUNTRIES = [
  TARGET,
  country('B1', 2, 0),
  country('B2', 0, 3),
  country('B3', -4, 0),
  country('B4', 0, -5),
  country('B5', 6, 6),
  country('B6', -7, -7),
  country('FAR', 60, 60),
  country('X', 80, 80),
];

describe('distanceKm()', () => {
  it('should measure one degree on the equator', () => {
    expect(Math.round(distanceKm({ lat: 0, lon: 0 }, { lat: 0, lon: 1 }))).toEqual(111);
  });
});

describe('nearbyCountries()', () => {
  it('should put neighbours first, then the closest countries', () => {
    expect(nearbyCountries(TARGET, COUNTRIES, 4).map((c) => c.code)).toEqual(['FAR', 'B1', 'B2', 'B3']);
  });
});

describe('nameItOptions()', () => {
  it('should offer the answer and three nearby countries', () => {
    for (let i = 0; i < 20; i++) {
      const options = nameItOptions(TARGET, COUNTRIES);
      expect(options).toHaveLength(OPTION_COUNT);
      expect(new Set(options).size).toEqual(OPTION_COUNT);
      expect(options).toContain('AA');
      expect(options).not.toContain('X');
    }
  });
});
