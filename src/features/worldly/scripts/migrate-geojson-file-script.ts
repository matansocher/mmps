import * as fs from 'fs';
import { promises as pfs } from 'fs';
import * as path from 'path';

const countries = JSON.parse(fs.readFileSync(path.join(__dirname, 'countries.json'), 'utf8'));
const geojson = JSON.parse(fs.readFileSync(path.join(__dirname, 'geo.json'), 'utf8'));

const countriesToHandle = countries.filter((c) => !c.geometry);

geojson.features.forEach((feature) => {
  const { geometry, properties } = feature;
  const { iso_n3: alpha3 } = properties;
  const relevantCountry = countriesToHandle.find((c) => c?.alpha3 === Number(alpha3));
  if (!relevantCountry) {
    return;
  }
  const relevantCountryIndex = countries.findIndex((c) => c?.alpha3 === Number(alpha3));
  countries[relevantCountryIndex] = { ...relevantCountry, geometry };
});

const filePath = `./countries.json`;
pfs.writeFile(filePath, JSON.stringify(countries));
