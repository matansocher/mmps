import { shuffleArray } from '@core/utils';
import { getCities } from '.';
import { City } from '../types';

const R = 6371; // Earth's radius in km

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (deg: number) => deg * (Math.PI / 180);

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

export function getMapDistractors(correctCity: City): Array<City & { distance: number }> {
  const options = getCities()
    .filter((c) => c.name !== correctCity.name)
    .map((c) => ({
      ...c,
      distance: haversineDistance(correctCity.lat, correctCity.lon, c.lat, c.lon),
    }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 7);
  return shuffleArray(options).slice(0, 3);
}
