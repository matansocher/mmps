import * as fs from 'fs';
import { fileURLToPath } from 'node:url';
import * as path from 'path';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const countries = JSON.parse(fs.readFileSync(path.join(__dirname, '../assets/countries.json'), 'utf8'));

const noCoordsCountries = countries.filter((c) => !c.geometry);

noCoordsCountries.forEach((c) => console.log(c.name));
console.log(`total of ${noCoordsCountries.length} countries without coordinates`);
