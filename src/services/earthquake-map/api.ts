import fs from 'fs';
import path from 'path';
import { Logger } from '@core/utils';
import { generateMapImage } from '@shared/map-service';
import { EARTHQUAKE_MAP_CONFIG } from './constants';
import type { EarthquakeMapOptions } from './types';

const logger = new Logger('EarthquakeMapService');

export async function generateEarthquakeMapImage(options: EarthquakeMapOptions): Promise<string> {
  const { lat, lon, magnitude, place } = options;

  logger.log(`Generating earthquake map for: ${place} (Mag: ${magnitude})`);

  const assetsDir = path.resolve(process.cwd(), 'assets', 'earthquakes');
  if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true });
  }

  const timestamp = Date.now();
  const sanitizedPlace = place.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50);
  const filename = `earthquake_${timestamp}_${sanitizedPlace}.png`;

  const outputPath = await generateMapImage(
    {
      lat,
      lon,
      zoom: EARTHQUAKE_MAP_CONFIG.zoom,
      tileRange: EARTHQUAKE_MAP_CONFIG.tileRange,
      tileSize: EARTHQUAKE_MAP_CONFIG.tileSize,
      addMarker: true,
    },
    assetsDir,
    filename,
  );

  logger.log(`Earthquake map saved to: ${outputPath}`);
  return outputPath;
}
