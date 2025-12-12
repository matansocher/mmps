import axios from 'axios';
import sharp from 'sharp';
import { Logger } from '@core/utils';
import { IMS_RADAR_REF, TILE_SIZE } from './constants';
import type { RadarBounds, TargetBounds, WorldPixel } from './types';

const logger = new Logger('RainRadarMapUtils');

// ============================================================================
// WEB MERCATOR PROJECTION UTILITIES
// ============================================================================

/**
 * Convert latitude/longitude to world pixel coordinates at a given zoom level.
 * Uses standard Web Mercator (EPSG:3857) projection.
 */
export function latLonToWorldPixel(lat: number, lon: number, zoom: number): WorldPixel {
  const scale = TILE_SIZE * Math.pow(2, zoom);

  // Longitude to X (linear)
  const x = ((lon + 180) / 360) * scale;

  // Latitude to Y (Mercator projection)
  const latRad = (lat * Math.PI) / 180;
  const mercatorY = Math.log(Math.tan(Math.PI / 4 + latRad / 2));
  const y = ((1 - mercatorY / Math.PI) / 2) * scale;

  return { x, y };
}

/**
 * Calculate the world pixel bounds of the IMS radar image.
 */
export function getRadarWorldBounds(): RadarBounds {
  const center = latLonToWorldPixel(IMS_RADAR_REF.centerLat, IMS_RADAR_REF.centerLon, IMS_RADAR_REF.zoom);
  return {
    left: center.x - IMS_RADAR_REF.width / 2,
    top: center.y - IMS_RADAR_REF.height / 2,
    right: center.x + IMS_RADAR_REF.width / 2,
    bottom: center.y + IMS_RADAR_REF.height / 2,
  };
}

/**
 * Convert target viewport bounds to IMS radar zoom level.
 */
export function getTargetBoundsAtRadarZoom(centerLat: number, centerLon: number, targetZoom: number, width: number, height: number): TargetBounds {
  // Scale factor between target zoom and radar zoom
  const zoomDiff = targetZoom - IMS_RADAR_REF.zoom;
  const scaleFactor = Math.pow(2, zoomDiff);

  // Target viewport size in radar zoom pixels
  const widthAtRadarZoom = width / scaleFactor;
  const heightAtRadarZoom = height / scaleFactor;

  // Convert target center to radar zoom level coordinates
  const targetCenterAtRadarZoom = latLonToWorldPixel(centerLat, centerLon, IMS_RADAR_REF.zoom);

  return {
    left: targetCenterAtRadarZoom.x - widthAtRadarZoom / 2,
    top: targetCenterAtRadarZoom.y - heightAtRadarZoom / 2,
    width: widthAtRadarZoom,
    height: heightAtRadarZoom,
  };
}

// ============================================================================
// MAP TILE FETCHING
// ============================================================================

/**
 * Fetch and composite map tiles for the specified viewport.
 */
export async function fetchMapTiles(centerLat: number, centerLon: number, zoom: number, width: number, height: number): Promise<Buffer> {
  logger.log(`Fetching map tiles: ${centerLat}°N, ${centerLon}°E (Zoom ${zoom}, ${width}x${height})`);

  // Calculate viewport bounds in world pixels
  const center = latLonToWorldPixel(centerLat, centerLon, zoom);
  const viewLeft = center.x - width / 2;
  const viewTop = center.y - height / 2;

  // Determine tile range needed
  const startTileX = Math.floor(viewLeft / TILE_SIZE);
  const endTileX = Math.floor((viewLeft + width) / TILE_SIZE);
  const startTileY = Math.floor(viewTop / TILE_SIZE);
  const endTileY = Math.floor((viewTop + height) / TILE_SIZE);

  const tiles: { input: Buffer; left: number; top: number }[] = [];

  for (let ty = startTileY; ty <= endTileY; ty++) {
    for (let tx = startTileX; tx <= endTileX; tx++) {
      const tileUrl = `https://tile.openstreetmap.org/${zoom}/${tx}/${ty}.png`;

      try {
        const res = await axios.get(tileUrl, {
          responseType: 'arraybuffer',
          headers: { 'User-Agent': 'MMPS-RainRadar/2.0' },
        });

        // Calculate tile position relative to viewport
        const tileWorldX = tx * TILE_SIZE;
        const tileWorldY = ty * TILE_SIZE;
        const left = Math.round(tileWorldX - viewLeft);
        const top = Math.round(tileWorldY - viewTop);

        tiles.push({
          input: Buffer.from(res.data),
          left,
          top,
        });

        // Rate limiting for OSM
        await new Promise((r) => setTimeout(r, 100));
      } catch {
        logger.warn(`Failed to fetch tile: ${tileUrl}`);
      }
    }
  }

  if (tiles.length === 0) {
    throw new Error('Failed to fetch any map tiles');
  }

  // Create canvas and composite tiles (no resize to avoid shifting)
  return sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r: 240, g: 240, b: 240, alpha: 1 },
    },
  })
    .composite(tiles)
    .png()
    .toBuffer();
}

// ============================================================================
// RADAR EXTRACTION
// ============================================================================

/**
 * Extract and scale radar data for the specified viewport.
 */
export async function extractRadarForViewport(radarBuffer: Buffer, centerLat: number, centerLon: number, targetZoom: number, width: number, height: number): Promise<Buffer> {
  logger.log(`Extracting radar for viewport: ${centerLat}°N, ${centerLon}°E (Zoom ${targetZoom})`);

  // Get radar bounds (in radar zoom coordinates)
  const radarBounds = getRadarWorldBounds();

  // Get target bounds (in radar zoom coordinates)
  const targetBounds = getTargetBoundsAtRadarZoom(centerLat, centerLon, targetZoom, width, height);

  // Calculate crop rectangle on the radar image
  const cropX = targetBounds.left - radarBounds.left;
  const cropY = targetBounds.top - radarBounds.top;
  const cropWidth = targetBounds.width;
  const cropHeight = targetBounds.height;

  // Clamp to valid bounds
  const safeX = Math.max(0, Math.min(Math.round(cropX), IMS_RADAR_REF.width - 1));
  const safeY = Math.max(0, Math.min(Math.round(cropY), IMS_RADAR_REF.height - 1));
  const safeWidth = Math.min(Math.round(cropWidth), IMS_RADAR_REF.width - safeX);
  const safeHeight = Math.min(Math.round(cropHeight), IMS_RADAR_REF.height - safeY);

  logger.log(`Crop: x=${safeX}, y=${safeY}, w=${safeWidth}, h=${safeHeight}`);

  // Convert radar to PNG (handles GIF input)
  const radarPng = await sharp(radarBuffer, { animated: false }).png().toBuffer();

  // Extract and scale the radar region
  return sharp(radarPng)
    .extract({
      left: safeX,
      top: safeY,
      width: safeWidth,
      height: safeHeight,
    })
    .resize(width, height, {
      kernel: sharp.kernel.lanczos3,
    })
    .png()
    .toBuffer();
}
