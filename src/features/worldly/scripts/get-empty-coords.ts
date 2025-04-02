import * as fs from 'fs';
import * as path from 'path';

const countries = JSON.parse(fs.readFileSync(path.join(__dirname, 'countries.json'), 'utf8'));

const noCoordsCountries = countries.filter((c) => !c.geometry);

noCoordsCountries.forEach((c) => console.log(c.name));
console.log(`total of ${noCoordsCountries.length} countries without coordinates`);
