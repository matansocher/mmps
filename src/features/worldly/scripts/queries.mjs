import * as fs from 'fs';
import { fileURLToPath } from 'node:url';
import path from 'path';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const countries = JSON.parse(fs.readFileSync(path.join(__dirname, './countries.json'), 'utf8'));

const print = (missingKey) => {
  const relevantCountries = countries.filter((country) => !country[missingKey]);
  console.log(`$$$$$$$$$ ${missingKey} $$$$$$$$$`);
  console.log('Countries missing\n', relevantCountries.map((c) => c.name).join('\n'));
  console.log('\n');
};

async function findMissing() {
  print('geometry');
  print('capital');
  print('hebrewCapital');
}

findMissing().catch(console.error);
