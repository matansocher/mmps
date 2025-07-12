import { Country, State } from '@core/mongo/worldly-mongo';
import { shuffleArray } from '@core/utils';

const R = 6371; // Earth's radius in km

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (deg: number) => deg * (Math.PI / 180);

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

export function getMapDistractors(allCountries: Country[], correctCountry: Country): Array<Country & { distance: number }> {
  const options = allCountries
    .filter((c) => c.continent === correctCountry.continent && c.alpha2 !== correctCountry.alpha2)
    .map((c) => ({
      ...c,
      distance: haversineDistance(correctCountry.lat, correctCountry.lon, c.lat, c.lon),
    }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 7);
  return shuffleArray(options).slice(0, 3);
}

export function getMapStateDistractors(allStates: State[], correctState: State): Array<State & { distance: number }> {
  const options = allStates
    .filter((state) => state.alpha2 !== correctState.alpha2)
    .map((state) => ({
      ...state,
      distance: haversineDistance(correctState.lat, correctState.lon, state.lat, state.lon),
    }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 7);
  return shuffleArray(options).slice(0, 3);
}

export function getFlagDistractors(allCountries: Country[], correctCountry: Country, filter: (country: Country) => boolean): Array<Country> {
  const options = allCountries
    .filter(filter)
    .filter((c) => c.continent === correctCountry.continent && c.alpha2 !== correctCountry.alpha2)
    .slice(0, 7);
  return shuffleArray(options).slice(0, 3);
}

export function getCapitalDistractors(allCountries: Country[], correctCountry: Country, filter: (country: Country) => boolean): Array<Country> {
  const options = allCountries
    .filter(filter)
    .filter((c) => c.continent === correctCountry.continent && c.alpha2 !== correctCountry.alpha2)
    .slice(0, 7);
  return shuffleArray(options).slice(0, 3);
}

// export function getFlagDistractors(allCountries: Country[], correctCountry: Country): Array<Country> {
//   return shuffleArray(correctCountry.flagDistractors)
//     .map((countryFlag) => allCountries.find((country) => country.name === countryFlag))
//     .slice(0, 3);
// }
//
// export function getCapitalDistractors(correctCountry: Country): Array<string> {
//   return shuffleArray(correctCountry.hebrewCapitalsDistractors).slice(0, 3);
// }
