import { estimateWalkingRoute, findNearestLightRailStations, getDistanceMeters } from './nearest';
import type { LightRailStation } from './types';

const STATIONS: LightRailStation[] = [
  { id: 'a1', nameHe: 'ארלוזורוב', nameEn: 'Arlozorov', lat: 32.0838, lon: 34.7983 },
  { id: 'a2', nameHe: 'ארלוזורוב', nameEn: 'Arlozorov', lat: 32.0839, lon: 34.7984 },
  { id: 'b', nameHe: 'אלנבי', nameEn: 'Allenby', lat: 32.0705, lon: 34.7745 },
  { id: 'c', nameHe: 'קרליבך', nameEn: 'Carlebach', lat: 32.0687, lon: 34.7858 },
];

describe('getDistanceMeters()', () => {
  it('should return 0 for the same point', () => {
    expect(getDistanceMeters({ lat: 32, lon: 34 }, { lat: 32, lon: 34 })).toEqual(0);
  });

  it('should compute ~111km per degree of latitude', () => {
    expect(Math.round(getDistanceMeters({ lat: 32, lon: 34 }, { lat: 33, lon: 34 }) / 1000)).toEqual(111);
  });
});

describe('estimateWalkingRoute()', () => {
  test.each([
    { straight: 800, expected: { meters: 1040, minutes: 13 } },
    { straight: 10, expected: { meters: 13, minutes: 1 } },
  ])('should estimate $expected for $straight meters', ({ straight, expected }) => {
    expect(estimateWalkingRoute(straight)).toEqual(expected);
  });
});

describe('findNearestLightRailStations()', () => {
  it('should return the closest stations sorted by distance, one per station name', () => {
    const result = findNearestLightRailStations(STATIONS, { lat: 32.0695, lon: 34.777 }, 3);
    expect(result.map(({ station }) => station.id)).toEqual(['b', 'c', 'a1']);
    expect(result[0].distanceMeters).toBeLessThan(result[1].distanceMeters);
  });

  it('should respect the limit', () => {
    expect(findNearestLightRailStations(STATIONS, { lat: 32.08, lon: 34.79 }, 1)).toHaveLength(1);
  });
});
