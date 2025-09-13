import { Country } from '../types';
import { getCollection } from './connection';
import { COLLECTIONS } from './constants';

let countries: Country[] = [];

export async function getAllCountries(): Promise<Country[]> {
  if (countries.length) {
    return countries;
  }
  const countryCollection = await getCollection<Country>(COLLECTIONS.COUNTRY);
  await countryCollection
    .find()
    .toArray()
    .then((c) => {
      countries = c;
    });
  return countries;
}

export async function getCountryByName(name: string): Promise<Country> {
  const allCountries = await getAllCountries();
  return allCountries.find((c) => c.name === name);
}

export async function getCountryByCapital(capitalName: string): Promise<Country> {
  const allCountries = await getAllCountries();
  return allCountries.find((country) => country.capital === capitalName);
}

export async function getRandomCountry(filter: (country: Country) => boolean): Promise<Country> {
  const allCountries = await getAllCountries();
  const filteredCountries = allCountries.filter(filter);
  return filteredCountries[Math.floor(Math.random() * filteredCountries.length)];
}
