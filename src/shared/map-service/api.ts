import path from 'path';
import sharp from 'sharp';
import { Logger } from '@core/utils';
import { OPENSTREETMAP_TILE_URL, DEFAULT_TILE_SIZE, DEFAULT_ZOOM, DEFAULT_TILE_RANGE } from './constants';
import type { MapOptions } from './types';
import { fetchBuffer, latLonToTile } from './utils';

const logger = new Logger('MapService');

export async function generateMapImage(options: MapOptions, outputDir: string, filename: string): Promise<string> {
  const { lat, lon, zoom = DEFAULT_ZOOM, tileRange = DEFAULT_TILE_RANGE, tileSize = DEFAULT_TILE_SIZE, addMarker = false } = options;

  logger.log(`Generating map image for Lat: ${lat}, Lon: ${lon}, Zoom: ${zoom}`);

  const center = latLonToTile(lat, lon, zoom);
  const tilesX = tileRange * 2 + 1;
  const tilesY = tileRange * 2 + 1;
  const width = tilesX * tileSize;
  const height = tilesY * tileSize;

  logger.log(`Grid: ${tilesX}x${tilesY} tiles, Image: ${width}x${height} pixels`);

  const mapLayers: { input: Buffer; left: number; top: number }[] = [];
  const gridPromises = [];

  for (let dy = -tileRange; dy <= tileRange; dy++) {
    for (let dx = -tileRange; dx <= tileRange; dx++) {
      gridPromises.push(
        (async () => {
          const tx = center.x + dx;
          const ty = center.y + dy;
          const left = (dx + tileRange) * tileSize;
          const top = (dy + tileRange) * tileSize;

          const mapUrl = `${OPENSTREETMAP_TILE_URL}/${zoom}/${tx}/${ty}.png`;

          logger.log(`Fetching: ${mapUrl}`);

          const mapBuf = await fetchBuffer(mapUrl, { 'User-Agent': 'MMPS-MapService/1.0' });

          if (mapBuf) {
            mapLayers.push({ input: mapBuf, left, top });
          }
        })(),
      );
    }
  }

  await Promise.all(gridPromises);

  if (mapLayers.length === 0) {
    throw new Error('Failed to fetch any map tiles');
  }

  const allLayers = [...mapLayers];

  if (addMarker) {
    const markerX = Math.floor(width / 2);
    const markerY = Math.floor(height / 2);
    const markerRadius = 16;
    const strokeWidth = 3;

    const markerSvg = `
      <svg width="${width}" height="${height}">
        <circle
          cx="${markerX}"
          cy="${markerY}"
          r="${markerRadius}"
          fill="#FF0000"
          stroke="#FFFFFF"
          stroke-width="${strokeWidth}"
        />
      </svg>
    `;

    const markerBuffer = Buffer.from(markerSvg);
    allLayers.push({
      input: markerBuffer,
      top: 0,
      left: 0,
    });

    logger.log(`Added red marker at center (${markerX}, ${markerY})`);
  }

  const outputPath = path.join(outputDir, filename);

  await sharp({
    create: { width, height, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 1 } },
  })
    .composite(allLayers)
    .toFile(outputPath);

  logger.log(`Map image saved to: ${outputPath}`);
  return outputPath;
}
