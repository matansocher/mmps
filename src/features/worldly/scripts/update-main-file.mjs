import { translate } from '@vitalets/google-translate-api';
import * as fs from 'fs';
import { fileURLToPath } from 'node:url';
import path from 'path';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const countries = JSON.parse(fs.readFileSync(path.join(__dirname, './countries.json'), 'utf8'));
const relevantCountries = countries.filter((country) => !country.hebrewCapital);

const translateToHe = async (englishName) => {
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
    const hebrewCapital = await translateToHe(country.capital);
    if (!hebrewCapital) {
      console.log(`Failed to translate ${country.capital}`);
      continue;
    }
    countries[index].hebrewCapital = hebrewCapital;
    console.log(`Translated ${country.capital} to ${hebrewCapital}`);
  }

  fs.writeFileSync(path.join(__dirname, './countries.json'), JSON.stringify(countries, null, 2));
}

main().catch(console.error);
