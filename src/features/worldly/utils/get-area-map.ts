import { Canvas } from 'canvas';
import * as fs from 'fs';
import * as path from 'path';
import { generateAreaMap, simplifyAreaName } from '.';
import { Area } from './generate-area-map';

function getLocalAreaMap(areaName: string): string {
  try {
    fs.readFileSync(path.join(__dirname, `../assets/images/${simplifyAreaName(areaName)}.png`), 'utf8');
    return path.join(__dirname, `../assets/images/${simplifyAreaName(areaName)}.png`);
  } catch (err) {
    return undefined;
  }
}

function saveAreaMapLocally(areaName: string, canvas: Canvas): string {
  const outputDir = path.join(__dirname, '../assets/images');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const filePath = path.join(outputDir, `${simplifyAreaName(areaName)}.png`);
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(filePath, buffer);

  return filePath;
}

export function getAreaMap(allAreas: Area[], name: string, isState = false): string {
  const localAreaMap = getLocalAreaMap(name);
  if (localAreaMap) {
    return localAreaMap;
  }
  const canvas = generateAreaMap(allAreas, name, isState);
  return saveAreaMapLocally(name, canvas);
}
