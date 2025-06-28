import { Canvas } from 'canvas';
import * as fs from 'fs';
import * as path from 'path';
import { generateCityMap, simplifyAreaName } from '.';

function getLocalCityMap(cityName: string): string {
  try {
    fs.readFileSync(path.join(__dirname, `../assets/images/${simplifyAreaName(cityName)}.png`), 'utf8');
    return path.join(__dirname, `../assets/images/${simplifyAreaName(cityName)}.png`);
  } catch (err) {
    return undefined;
  }
}

function saveCityMapLocally(cityName: string, canvas: Canvas): string {
  const outputDir = path.join(__dirname, '../assets/images');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const filePath = path.join(outputDir, `${simplifyAreaName(cityName)}.png`);
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(filePath, buffer);

  return filePath;
}

export function getCityMap(name: string): string {
  const localCityMap = getLocalCityMap(name);
  if (localCityMap) {
    return localCityMap;
  }
  const canvas = generateCityMap(name);
  return saveCityMapLocally(name, canvas);
}
