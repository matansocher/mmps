import axios from 'axios';
import path from 'node:path';
import sharp from 'sharp';
import { Logger } from '@core/utils';
import { IMS_TILE_URL, IMS_USER_AGENT, LABEL_FONT_PATH, RADAR_OPACITY, TILE_SIZE } from './constants';
import type { GeoBounds, GeoPoint, RadarView } from './types';

const logger = new Logger('rain-radar:map-utils');

type Overlay = { readonly input: Buffer; readonly left: number; readonly top: number };

const baseMapCache = new Map<string, Promise<Buffer>>();

// Web Mercator world pixel coordinates, identical to Leaflet's projection
export function project({ lat, lon }: GeoPoint, zoom: number): { readonly x: number; readonly y: number } {
  const scale = TILE_SIZE * 2 ** zoom;
  const latRad = (lat * Math.PI) / 180;
  return {
    x: ((lon + 180) / 360) * scale,
    y: ((1 - Math.log(Math.tan(Math.PI / 4 + latRad / 2)) / Math.PI) / 2) * scale,
  };
}

export function getViewOrigin(view: RadarView): { readonly left: number; readonly top: number } {
  const center = project(view.center, view.zoom);
  return { left: center.x - view.width / 2, top: center.y - view.height / 2 };
}

export function toViewPixel(point: GeoPoint, view: RadarView): { readonly x: number; readonly y: number } {
  const origin = getViewOrigin(view);
  const { x, y } = project(point, view.zoom);
  return { x: x - origin.left, y: y - origin.top };
}

async function fetchTile(zoom: number, x: number, y: number): Promise<Buffer | null> {
  try {
    const res = await axios.get<ArrayBuffer>(IMS_TILE_URL(zoom, x, y), { responseType: 'arraybuffer', timeout: 15_000, headers: { 'User-Agent': IMS_USER_AGENT } });
    return Buffer.from(res.data);
  } catch {
    logger.warn(`Failed to fetch map tile ${zoom}/${x}/${y}`);
    return null;
  }
}

async function buildBaseMap(view: RadarView): Promise<Buffer> {
  const { left, top } = getViewOrigin(view);
  const tiles: Overlay[] = [];

  // Sequential on purpose - the IMS server drops bursts of parallel requests
  for (let ty = Math.floor(top / TILE_SIZE); ty <= Math.floor((top + view.height - 1) / TILE_SIZE); ty++) {
    for (let tx = Math.floor(left / TILE_SIZE); tx <= Math.floor((left + view.width - 1) / TILE_SIZE); tx++) {
      const tile = await fetchTile(view.zoom, tx, ty);
      if (tile) tiles.push({ input: tile, left: Math.round(tx * TILE_SIZE - left), top: Math.round(ty * TILE_SIZE - top) });
    }
  }

  if (!tiles.length) {
    throw new Error('Failed to fetch any map tiles');
  }

  return sharp({ create: { width: view.width, height: view.height, channels: 4, background: '#b9dcee' } })
    .composite(tiles)
    .png()
    .toBuffer();
}

// Map tiles are static, so the composed base map is cached for the lifetime of the process
export async function getBaseMap(view: RadarView): Promise<Buffer> {
  const key = JSON.stringify(view);
  if (!baseMapCache.has(key)) {
    const promise = buildBaseMap(view);
    baseMapCache.set(key, promise);
    promise.catch(() => baseMapCache.delete(key));
  }
  return baseMapCache.get(key);
}

// Mirrors L.imageOverlay: the image is stretched linearly between its projected corners
export async function createRadarOverlay(radarImage: Buffer, bounds: GeoBounds, view: RadarView): Promise<Overlay | null> {
  const origin = getViewOrigin(view);
  const nw = project({ lat: bounds.north, lon: bounds.west }, view.zoom);
  const se = project({ lat: bounds.south, lon: bounds.east }, view.zoom);

  const radarLeft = Math.round(nw.x - origin.left);
  const radarTop = Math.round(nw.y - origin.top);
  const radarWidth = Math.round(se.x - nw.x);
  const radarHeight = Math.round(se.y - nw.y);

  const cropLeft = Math.max(0, -radarLeft);
  const cropTop = Math.max(0, -radarTop);
  const visibleWidth = Math.min(radarWidth - cropLeft, view.width - Math.max(0, radarLeft));
  const visibleHeight = Math.min(radarHeight - cropTop, view.height - Math.max(0, radarTop));

  if (visibleWidth <= 0 || visibleHeight <= 0) {
    return null;
  }

  const input = await sharp(radarImage, { animated: false })
    .ensureAlpha()
    .resize(radarWidth, radarHeight, { fit: 'fill', kernel: sharp.kernel.nearest })
    .extract({ left: cropLeft, top: cropTop, width: visibleWidth, height: visibleHeight })
    .linear([1, 1, 1, RADAR_OPACITY], [0, 0, 0, 0])
    .png()
    .toBuffer();

  return { input, left: Math.max(0, radarLeft), top: Math.max(0, radarTop) };
}

export function createMarkerOverlay(point: GeoPoint, view: RadarView): Overlay | null {
  const { x, y } = toViewPixel(point, view);
  // An ellipse around the point, so the city name printed on the map tiles stays readable
  const width = 96;
  const height = 38;
  const left = Math.round(x - width / 2);
  const top = Math.round(y - height / 2);
  if (left < 0 || top < 0 || left + width > view.width || top + height > view.height) {
    return null;
  }

  const ellipse = `cx="${width / 2}" cy="${height / 2}" rx="${width / 2 - 3}" ry="${height / 2 - 3}" fill="none"`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <ellipse ${ellipse} stroke="#ffffff" stroke-width="5"/>
    <ellipse ${ellipse} stroke="#e0001b" stroke-width="2.5"/>
  </svg>`;
  return { input: Buffer.from(svg), left, top };
}

export function createProgressOverlay(index: number, total: number, view: RadarView): Overlay {
  const height = 6;
  const filled = Math.round((view.width * (index + 1)) / total);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${view.width}" height="${height}">
    <rect width="${view.width}" height="${height}" fill="#17324d" fill-opacity="0.5"/>
    <rect width="${filled}" height="${height}" fill="#fbb034"/>
  </svg>`;
  return { input: Buffer.from(svg), left: 0, top: view.height - height };
}

export async function createLabelOverlay(text: string, view: RadarView): Promise<Overlay | null> {
  try {
    const { data, info } = await sharp({
      text: { text: `<span foreground="#ffffff">${text}</span>`, fontfile: path.resolve(process.cwd(), LABEL_FONT_PATH), font: 'Noto Sans Hebrew Bold 22', rgba: true, dpi: 72 },
    })
      .png()
      .toBuffer({ resolveWithObject: true });

    const paddingX = 12;
    const paddingY = 6;
    const input = await sharp({ create: { width: info.width + paddingX * 2, height: info.height + paddingY * 2, channels: 4, background: { r: 23, g: 50, b: 77, alpha: 0.9 } } })
      .composite([{ input: data, left: paddingX, top: paddingY }])
      .png()
      .toBuffer();

    return { input, left: view.width - info.width - paddingX * 2 - 10, top: 10 };
  } catch (err) {
    logger.warn(`Failed to render radar label: ${err}`);
    return null;
  }
}
