import { getCollection, getMongoDb } from '@core/mongo/shared';
import { Country } from '../models';
import { COLLECTIONS, DB_NAME } from '../worldly-mongo.config';

let _countries: Country[] | null = null;

export async function getAllCountries(): Promise<Country[]> {
  if (!_countries) {
    const db = await getMongoDb(DB_NAME);
    const collection = getCollection<Country>(db, COLLECTIONS.COUNTRY);
    _countries = await collection.find().toArray();
  }
  return _countries;
}

export async function getCountryByName(name: string): Promise<Country | undefined> {
  const allCountries = await getAllCountries();
  return allCountries.find((c) => c.name === name);
}

export async function getCountryByCapital(capitalName: string): Promise<Country | undefined> {
  const allCountries = await getAllCountries();
  return allCountries.find((country) => country.capital === capitalName);
}

export async function getRandomCountry(filter: (country: Country) => boolean): Promise<Country | undefined> {
  const allCountries = await getAllCountries();
  const filteredCountries = allCountries.filter(filter);
  if (filteredCountries.length === 0) return undefined;
  return filteredCountries[Math.floor(Math.random() * filteredCountries.length)];
}
