import { translate } from '@vitalets/google-translate-api';
import * as fs from 'fs';
import { fileURLToPath } from 'node:url';
import path from 'path';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const countries = JSON.parse(fs.readFileSync(path.join(__dirname, '../assets/countries.json'), 'utf8'));
const relevantCountries = countries.filter((country) => !country.hebrewName);

const translateCountryName = async (englishName) => {
  try {
    const result = await translate(englishName, { to: 'he' });
    return result.text;
  } catch (err) {
    console.error(`Error translating ${englishName}:`, err);
    return null;
  }
};

async function main() {
  for (const country of relevantCountries) {
    const index = countries.findIndex((c) => c.alpha2 === country.alpha2);
    const hebrewName = await translateCountryName(country.name);
    if (!hebrewName) {
      console.log(`Failed to translate ${country.name}`);
      continue;
    }
    countries[index].hebrewName = hebrewName;
    console.log(`Translated ${country.name} to ${hebrewName}`);
  }

  fs.writeFileSync(path.join(__dirname, '../assets/countries.json'), JSON.stringify(countries, null, 2));
}

main().catch(console.error);
