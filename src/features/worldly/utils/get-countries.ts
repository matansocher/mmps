import * as fs from 'fs';
import * as path from 'path';
import { Country, State } from '../types';

const countries = JSON.parse(fs.readFileSync(path.join(__dirname, '../assets/countries.json'), 'utf8'));
const states = JSON.parse(fs.readFileSync(path.join(__dirname, '../assets/states.json'), 'utf8'));

export function getCountries(): Country[] {
  return [...countries];
}

export function getStates(): State[] {
  return [...states];
}

export function getCountryByName(name: string): Country {
  const countries = getCountries();
  return countries.find((c) => c.name === name);
}

export function getStateByName(state: string): State {
  const states = getStates();
  return states.find((c) => c.name === state);
}

export function getCountryByCapital(capital: string): Country {
  const countries = getCountries();
  return countries.find((c) => c.capital === capital);
}

export function getRandomCountry(filter: (country: Country) => boolean): Country {
  const countries = getCountries();
  const filteredCountries = countries.filter(filter);
  return filteredCountries[Math.floor(Math.random() * filteredCountries.length)];
}

export function getRandomState(filter: (country: State) => boolean): State {
  const countries = getStates();
  const filteredStates = countries.filter(filter);
  return filteredStates[Math.floor(Math.random() * filteredStates.length)];
}
