import * as fs from 'fs';
import * as path from 'path';
import { City, Country } from '../types';

const cities = JSON.parse(fs.readFileSync(path.join(__dirname, '../assets/cities.json'), 'utf8'));
const country = JSON.parse(fs.readFileSync(path.join(__dirname, '../assets/country.json'), 'utf8'));

export function getCountry(): Country {
  return country;
}

export function getCities(): City[] {
  return [...cities];
}

export function getCityByName(name: string): City {
  const cities = getCities();
  return cities.find((c) => c.name === name);
}

export function getRandomCity(filter: (city: City) => boolean): City {
  const cities = getCities();
  const filteredCities = cities.filter(filter);
  return filteredCities[Math.floor(Math.random() * filteredCities.length)];
}
