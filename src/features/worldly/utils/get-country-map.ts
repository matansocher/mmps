import { Canvas } from 'canvas';
import * as fs from 'fs';
import * as path from 'path';
import { generateCountryMap, simplifyCountryName } from '.';

function getLocalCountryMap(countryName: string): string {
  try {
    fs.readFileSync(path.join(__dirname, `../assets/images/${simplifyCountryName(countryName)}.png`), 'utf8');
    return path.join(__dirname, `../assets/images/${simplifyCountryName(countryName)}.png`);
  } catch (err) {
    return undefined;
  }
}

function saveCountryMapLocally(countryName: string, canvas: Canvas): string {
  const outputDir = path.join(__dirname, '../assets/images');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const filePath = path.join(outputDir, `${simplifyCountryName(countryName)}.png`);
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(filePath, buffer);

  return filePath;
}

export function getCountryMap(name: string, isState = false): string {
  const localCountryMap = getLocalCountryMap(name);
  if (localCountryMap) {
    return localCountryMap;
  }
  const canvas = generateCountryMap(name, isState);
  return saveCountryMapLocally(name, canvas);
}
