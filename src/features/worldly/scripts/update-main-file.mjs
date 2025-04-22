import { translate } from '@vitalets/google-translate-api';
import * as fs from 'fs';
import { fileURLToPath } from 'node:url';
import path from 'path';
import { dirname } from 'path';

const filePath = '../assets/states.json';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const states = JSON.parse(fs.readFileSync(path.join(__dirname, filePath), 'utf8'));
const relevantStates = states.filter((state) => !state.hebrewName);

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
  for (const state of relevantStates) {
    const index = states.findIndex((c) => c.alpha2 === state.alpha2);

    const hebrewName = await translateToHe(state.name);
    if (!hebrewName) {
      console.log(`Failed to translate ${state.name}`);
      continue;
    }
    states[index].hebrewName = hebrewName;

    const hebrewCapital = await translateToHe(state.capital);
    if (!hebrewCapital) {
      console.log(`Failed to translate ${state.capital}`);
      continue;
    }
    states[index].hebrewCapital = hebrewCapital;

    console.log(`Translated ${state.name}`);
  }

  fs.writeFileSync(path.join(__dirname, filePath), JSON.stringify(states, null, 2));
}

main().catch(console.error);
