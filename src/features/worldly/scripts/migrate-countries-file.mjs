import { translate } from '@vitalets/google-translate-api';
import * as fs from 'fs';
import { fileURLToPath } from 'node:url';
import path from 'path';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const countries = JSON.parse(fs.readFileSync(path.join(__dirname, '../assets/countries.json'), 'utf8'));
const scriptsCountries = JSON.parse(fs.readFileSync(path.join(__dirname, './countries.json'), 'utf8'));

async function main() {
  for (const country of countries) {
    const index = scriptsCountries.findIndex((c) => c.alpha2 === country.alpha2);
    const scriptsCountry = scriptsCountries[index];
    if (!scriptsCountry) {
      console.log(`Could not find country with alpha2 ${country.alpha2}`);
      continue;
    }
    if (scriptsCountry.hebrewName) {
      countries[index].hebrewName = scriptsCountry.hebrewName;
    }
    if (scriptsCountry.hebrewCapital) {
      countries[index].hebrewCapital = scriptsCountry.hebrewCapital;
    }
    console.log(`finished processing ${countries[index].name}`);
  }

  fs.writeFileSync(path.join(__dirname, './new-countries.json'), JSON.stringify(countries, null, 2)); // copy this file content to ../assets/countries.json
}

main().catch(console.error);
