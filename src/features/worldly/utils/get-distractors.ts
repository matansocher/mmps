import { getDistance, shuffleArray } from '@core/utils';
import { Country, State } from '@shared//worldly';

export function getMapDistractors(allCountries: Country[], correctCountry: Country): Array<Country & { distance: number }> {
  const options = allCountries
    .filter((c) => c.continent === correctCountry.continent && c.alpha2 !== correctCountry.alpha2)
    .map((c) => ({
      ...c,
      distance: getDistance({ lat: correctCountry.lat, lon: correctCountry.lon }, { lat: c.lat, lon: c.lon }),
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
      distance: getDistance({ lat: correctState.lat, lon: correctState.lon }, { lat: state.lat, lon: state.lon }),
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
