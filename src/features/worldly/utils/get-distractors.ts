import { shuffleArray } from '@core/utils';
import { getCountries, getStates } from '.';
import { Country, State } from '../types';

const R = 6371; // Earth's radius in km

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (deg: number) => deg * (Math.PI / 180);

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

export function getMapDistractors(correctCountry: Country): Array<Country & { distance: number }> {
  const options = getCountries()
    .filter((c) => c.continent === correctCountry.continent && c.alpha2 !== correctCountry.alpha2)
    .map((c) => ({
      ...c,
      distance: haversineDistance(correctCountry.lat, correctCountry.lon, c.lat, c.lon),
    }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 7);
  return shuffleArray(options).slice(0, 3);
}

export function getMapStateDistractors(correctState: State): Array<State & { distance: number }> {
  const options = getStates()
    .filter((state) => state.alpha2 !== correctState.alpha2)
    .map((state) => ({
      ...state,
      distance: haversineDistance(correctState.lat, correctState.lon, state.lat, state.lon),
    }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 7);
  return shuffleArray(options).slice(0, 3);
}

export function getFlagDistractors(correctCountry: Country, filter: (country: Country) => boolean): Array<Country> {
  const options = getCountries()
    .filter(filter)
    .filter((c) => c.continent === correctCountry.continent && c.alpha2 !== correctCountry.alpha2)
    .slice(0, 7);
  return shuffleArray(options).slice(0, 3);
}

export function getCapitalDistractors(correctCountry: Country, filter: (country: Country) => boolean): Array<Country> {
  const options = getCountries()
    .filter(filter)
    .filter((c) => c.continent === correctCountry.continent && c.alpha2 !== correctCountry.alpha2)
    .slice(0, 7);
  return shuffleArray(options).slice(0, 3);
}
