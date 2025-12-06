import axios from 'axios';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { Logger } from '@core/utils';
import { fetchBuffer, latLonToTile } from './utils';

export interface RainRadarOptions {
  lat?: number;
  lon?: number;
  zoom?: number;
  tileRange?: number; // Number of tiles in each direction (e.g., 1 = 3x3 grid)
}

const logger = new Logger('RainRadarService');

// Default Configuration (Kfar Saba, Israel)
const DEFAULT_CONFIG = {
  lat: 32.1782049,
  lon: 34.9123794,
  zoom: 10,
  tileRange: 1, // 3x3 Grid
  tileSize: 256,
};

export async function generateRainRadarImage(options: RainRadarOptions = {}): Promise<string> {
  const config = { ...DEFAULT_CONFIG, ...options };
  const { lat, lon, zoom, tileRange, tileSize } = config;

  logger.log(`Generating Rain Radar Image for Lat: ${lat}, Lon: ${lon}, Zoom: ${zoom}`);

  // 1. Fetch RainViewer Metadata
  const metaResponse = await axios.get('https://api.rainviewer.com/public/weather-maps.json');
  const meta = metaResponse.data;

  // Get latest radar path
  if (!meta.radar || !meta.radar.past || meta.radar.past.length === 0) {
    throw new Error('No radar data available from RainViewer API');
  }

  const latest = meta.radar.past[meta.radar.past.length - 1];
  const host = meta.host || 'https://tile.rainviewer.com';
  const radarPathBase = `${host}${latest.path}/${tileSize}/${zoom}`;
  const timestamp = latest.time;

  // 2. Calculate Grid
  const center = latLonToTile(lat, lon, zoom);
  const tilesX = tileRange * 2 + 1;
  const tilesY = tileRange * 2 + 1;
  const width = tilesX * tileSize;
  const height = tilesY * tileSize;

  // 3. Fetch Tiles (Parallel)
  const mapLayers: { input: Buffer; left: number; top: number }[] = [];
  const radarLayers: { input: Buffer; left: number; top: number }[] = [];

  const gridPromises = [];
  for (let dy = -tileRange; dy <= tileRange; dy++) {
    for (let dx = -tileRange; dx <= tileRange; dx++) {
      gridPromises.push(
        (async () => {
          const tx = center.x + dx;
          const ty = center.y + dy;
          const left = (dx + tileRange) * tileSize;
          const top = (dy + tileRange) * tileSize;

          const mapUrl = `https://tile.openstreetmap.org/${zoom}/${tx}/${ty}.png`;
          const radarUrl = `${radarPathBase}/${tx}/${ty}/2/1_1.png`;

          logger.log(`Fetching: ${mapUrl}`);

          const [mapBuf, radarBuf] = await Promise.all([fetchBuffer(mapUrl, { 'User-Agent': 'MMPS-RainRadar/1.0' }), fetchBuffer(radarUrl)]);

          if (mapBuf) mapLayers.push({ input: mapBuf, left, top });
          if (radarBuf) radarLayers.push({ input: radarBuf, left, top });
        })(),
      );
    }
  }

  await Promise.all(gridPromises);

  // 4. Composite
  // Layer order: All Maps (Background) -> All Radar (Overlay)
  const allLayers = [...mapLayers, ...radarLayers];

  if (allLayers.length === 0) {
    throw new Error('Failed to fetch any tiles');
  }

  const assetsDir = path.resolve(process.cwd(), 'assets', 'radar');
  if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true });
  }

  const filename = `radar_${timestamp}.png`;
  const outputPath = path.join(assetsDir, filename);

  await sharp({ create: { width, height, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 1 } } })
    .composite(allLayers)
    .toFile(outputPath);

  logger.log(`Radar image saved to: ${outputPath}`);
  return outputPath;
}
