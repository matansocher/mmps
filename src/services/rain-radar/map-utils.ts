import axios from 'axios';
import sharp from 'sharp';
import { Logger } from '@core/utils';
import { RADAR_BOUNDS, RADAR_OPACITY, TILE_SIZE } from './constants';

const logger = new Logger('RainRadarMapUtils');

// ============================================================================
// WEB MERCATOR PROJECTION
// ============================================================================

export function latToY(lat: number, zoom: number): number {
  const scale = TILE_SIZE * Math.pow(2, zoom);
  const latRad = (lat * Math.PI) / 180;
  return ((1 - Math.log(Math.tan(Math.PI / 4 + latRad / 2)) / Math.PI) / 2) * scale;
}

export function lonToX(lon: number, zoom: number): number {
  const scale = TILE_SIZE * Math.pow(2, zoom);
  return ((lon + 180) / 360) * scale;
}

// ============================================================================
// MAP TILE FETCHING
// ============================================================================

export type ViewportInfo = {
  readonly buffer: Buffer;
  readonly viewLeft: number;
  readonly viewTop: number;
};

export async function fetchMapTiles(zoom: number, width: number, height: number): Promise<ViewportInfo> {
  const topPx = latToY(RADAR_BOUNDS.north, zoom);
  const bottomPx = latToY(RADAR_BOUNDS.south, zoom);
  const leftPx = lonToX(RADAR_BOUNDS.west, zoom);
  const rightPx = lonToX(RADAR_BOUNDS.east, zoom);

  const centerX = (leftPx + rightPx) / 2;
  const centerY = (topPx + bottomPx) / 2;

  const viewLeft = centerX - width / 2;
  const viewTop = centerY - height / 2;

  const startTileX = Math.floor(viewLeft / TILE_SIZE);
  const endTileX = Math.floor((viewLeft + width) / TILE_SIZE);
  const startTileY = Math.floor(viewTop / TILE_SIZE);
  const endTileY = Math.floor((viewTop + height) / TILE_SIZE);

  logger.log(`Fetching ${(endTileX - startTileX + 1) * (endTileY - startTileY + 1)} map tiles (zoom ${zoom})`);

  const tiles: { input: Buffer; left: number; top: number }[] = [];

  for (let ty = startTileY; ty <= endTileY; ty++) {
    for (let tx = startTileX; tx <= endTileX; tx++) {
      const tileUrl = `https://tile.openstreetmap.org/${zoom}/${tx}/${ty}.png`;
      try {
        const res = await axios.get(tileUrl, {
          responseType: 'arraybuffer',
          headers: { 'User-Agent': 'MMPS-RainRadar/2.0' },
        });
        tiles.push({
          input: Buffer.from(res.data),
          left: Math.round(tx * TILE_SIZE - viewLeft),
          top: Math.round(ty * TILE_SIZE - viewTop),
        });
        await new Promise((r) => setTimeout(r, 100));
      } catch {
        logger.warn(`Failed to fetch tile: ${tileUrl}`);
      }
    }
  }

  if (tiles.length === 0) {
    throw new Error('Failed to fetch any map tiles');
  }

  const buffer = await sharp({
    create: { width, height, channels: 4, background: { r: 240, g: 240, b: 240, alpha: 1 } },
  })
    .composite(tiles)
    .png()
    .toBuffer();

  return { buffer, viewLeft, viewTop };
}

// ============================================================================
// RADAR OVERLAY
// ============================================================================

export async function createRadarOverlay(
  radarBuffer: Buffer,
  zoom: number,
  viewLeft: number,
  viewTop: number,
  width: number,
  height: number,
): Promise<{ input: Buffer; left: number; top: number }> {
  const radarTopPx = latToY(RADAR_BOUNDS.north, zoom);
  const radarBottomPx = latToY(RADAR_BOUNDS.south, zoom);
  const radarLeftPx = lonToX(RADAR_BOUNDS.west, zoom);
  const radarRightPx = lonToX(RADAR_BOUNDS.east, zoom);

  const radarWidthPx = Math.round(radarRightPx - radarLeftPx);
  const radarHeightPx = Math.round(radarBottomPx - radarTopPx);

  const radarX = Math.round(radarLeftPx - viewLeft);
  const radarY = Math.round(radarTopPx - viewTop);

  logger.log(`Radar overlay: ${radarWidthPx}x${radarHeightPx}px, position: (${radarX}, ${radarY})`);

  const radarPng = await sharp(radarBuffer, { animated: false }).png().toBuffer();
  const resized = await sharp(radarPng).resize(radarWidthPx, radarHeightPx, { kernel: sharp.kernel.lanczos3 }).ensureAlpha().toBuffer();

  // Apply opacity
  const { data, info } = await sharp(resized).raw().toBuffer({ resolveWithObject: true });
  for (let i = 3; i < data.length; i += 4) {
    data[i] = Math.round(data[i] * RADAR_OPACITY);
  }
  const withOpacity = await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
    .png()
    .toBuffer();

  // Crop to visible portion within viewport
  const cropLeft = Math.max(0, -radarX);
  const cropTop = Math.max(0, -radarY);
  const placeLeft = Math.max(0, radarX);
  const placeTop = Math.max(0, radarY);
  const visibleWidth = Math.min(radarWidthPx - cropLeft, width - placeLeft);
  const visibleHeight = Math.min(radarHeightPx - cropTop, height - placeTop);

  if (visibleWidth <= 0 || visibleHeight <= 0) {
    throw new Error('Radar image does not overlap with the viewport');
  }

  const cropped = await sharp(withOpacity).extract({ left: cropLeft, top: cropTop, width: visibleWidth, height: visibleHeight }).png().toBuffer();

  return { input: cropped, left: placeLeft, top: placeTop };
}
