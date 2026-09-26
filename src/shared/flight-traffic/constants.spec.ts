import countries from '@features/worldly/assets/countries.json';
import { MONITORED_COUNTRIES } from './constants';
import { isPointInGeometry } from './geo';
import type { CountryGeometry } from './types';

const NM_IN_KM = 1.852;

function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = Math.PI / 180;
  const a = Math.sin(((lat2 - lat1) * toRad) / 2) ** 2 + Math.cos(lat1 * toRad) * Math.cos(lat2 * toRad) * Math.sin(((lon2 - lon1) * toRad) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(a));
}

describe('MONITORED_COUNTRIES', () => {
  test.each(MONITORED_COUNTRIES.map((country) => ({ country })))('should cover the whole $country.name border with its circles', ({ country }) => {
    const geometry = countries.find(({ alpha2 }) => alpha2 === country.alpha2)?.geometry as CountryGeometry;
    expect(geometry).toBeDefined();

    const uncovered: Array<[number, number]> = [];
    for (let lat = -90; lat <= 90; lat += 0.1) {
      for (let lon = -180; lon <= 180; lon += 0.1) {
        if (Math.abs(lat - country.mapCenter.lat) > 20 || Math.abs(lon - country.mapCenter.lon) > 20) continue;
        if (!isPointInGeometry(lat, lon, geometry)) continue;
        const covered = country.circles.some((circle) => distanceKm(lat, lon, circle.lat, circle.lon) <= circle.radiusNm * NM_IN_KM);
        if (!covered) uncovered.push([lat, lon]);
      }
    }

    expect(uncovered).toEqual([]);
  });
});
