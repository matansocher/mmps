import { loadImage } from 'canvas';
import type { CanvasRenderingContext2D } from 'canvas';
import { env } from 'node:process';
import { createScaledCanvas, drawDot, font, roundRect } from '@shared/image-card';
import type { ImageLanguage } from '@shared/image-card';
import type { LightRailStation, LightRailTimetable } from './types';

type Point = { readonly x: number; readonly y: number };
type Box = { readonly left: number; readonly top: number; readonly right: number; readonly bottom: number };

export type LightRailNetwork = {
  readonly stations: readonly LightRailStation[];
  readonly edges: readonly (readonly [number, number])[]; // Pairs of station indexes in `stations`
};

const STATIC_MAP_URL = 'https://maps.googleapis.com/maps/api/staticmap';
// Static Maps caps a single image at 640x640, so bigger maps are stitched from a grid of requests.
const STATIC_MAP_MAX_SIZE = 640;
const MAX_CANVAS_WIDTH = 1000;
const MAX_CANVAS_HEIGHT = 1000;
const MAP_SCALE = 2;
const TILE_SIZE = 256;
const FIT_PADDING = 80;
const MAX_ZOOM = 15;
const LABEL_SIZE = 11;
const LABEL_PADDING = 3;
const LABEL_GAP = 7;
// Trip patterns rarer than this share of the busiest one (short turns, depot runs) are left off the map.
const MIN_PATTERN_SHARE = 0.1;
// Hides other transit lines and points of interest so the Red Line stands out.
const MAP_STYLES = ['feature:poi|visibility:off', 'feature:transit|visibility:off', 'feature:road|saturation:-100|lightness:30', 'feature:landscape|saturation:-100'];
const LINE_COLOR = '#e3262f';

const LABELS: Record<ImageLanguage, { readonly title: string; readonly subtitle: (count: number) => string }> = {
  he: { title: 'הרכבת הקלה · הקו האדום', subtitle: (count) => `${count} תחנות · פתח תקווה ↔ בת ים` },
  en: { title: 'Light Rail · Red Line', subtitle: (count) => `${count} stations · Petah Tikva ↔ Bat Yam` },
};

const cache = new Map<string, Buffer>();

export function buildLightRailNetwork(timetable: LightRailTimetable): LightRailNetwork {
  const patterns = new Map<string, number>();
  for (const trip of timetable.trips) {
    const key = trip.stops.map(([index]) => index).join(',');
    patterns.set(key, (patterns.get(key) ?? 0) + 1);
  }
  const busiest = Math.max(0, ...patterns.values());
  const edges = new Map<string, readonly [number, number]>();
  for (const [key, count] of patterns) {
    if (count < busiest * MIN_PATTERN_SHARE) continue;
    const indexes = key.split(',').map(Number);
    for (let i = 1; i < indexes.length; i++) {
      const pair = [Math.min(indexes[i - 1], indexes[i]), Math.max(indexes[i - 1], indexes[i])] as const;
      edges.set(pair.join('-'), pair);
    }
  }
  return { stations: timetable.stations, edges: [...edges.values()] };
}

function toWorld(lat: number, lon: number, zoom: number): Point {
  const size = TILE_SIZE * 2 ** zoom;
  const sin = Math.sin((lat * Math.PI) / 180);
  return { x: ((lon + 180) / 360) * size, y: (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * size };
}

function fromWorld({ x, y }: Point, zoom: number): { readonly lat: number; readonly lon: number } {
  const size = TILE_SIZE * 2 ** zoom;
  return { lat: (Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / size))) * 180) / Math.PI, lon: (x / size) * 360 - 180 };
}

type MapFrame = { readonly zoom: number; readonly origin: Point; readonly width: number; readonly height: number };

// Picks the closest zoom whose padded bounding box fits the canvas limits; `origin` is the world pixel at the canvas top-left.
export function fitMapFrame(stations: readonly LightRailStation[]): MapFrame {
  for (let zoom = MAX_ZOOM; zoom > 0; zoom--) {
    const points = stations.map((station) => toWorld(station.lat, station.lon, zoom));
    const minX = Math.min(...points.map((p) => p.x));
    const minY = Math.min(...points.map((p) => p.y));
    const width = Math.ceil(Math.max(...points.map((p) => p.x)) - minX + FIT_PADDING * 2);
    const height = Math.ceil(Math.max(...points.map((p) => p.y)) - minY + FIT_PADDING * 2);
    if (zoom === 1 || (width <= MAX_CANVAS_WIDTH && height <= MAX_CANVAS_HEIGHT)) return { zoom, origin: { x: minX - FIT_PADDING, y: minY - FIT_PADDING }, width, height };
  }
}

// Splits the frame into evenly sized static map requests; each tile's `left`/`top` is its offset on the canvas.
function planTiles({ width, height }: MapFrame): { readonly left: number; readonly top: number; readonly width: number; readonly height: number }[] {
  const cols = Math.ceil(width / STATIC_MAP_MAX_SIZE);
  const rows = Math.ceil(height / STATIC_MAP_MAX_SIZE);
  const tileWidth = Math.ceil(width / cols);
  const tileHeight = Math.ceil(height / rows);
  return Array.from({ length: cols * rows }, (_, i) => ({ left: (i % cols) * tileWidth, top: Math.floor(i / cols) * tileHeight, width: tileWidth, height: tileHeight }));
}

export function buildStaticMapUrl(
  center: { readonly lat: number; readonly lon: number },
  zoom: number,
  size: { readonly width: number; readonly height: number },
  language: ImageLanguage,
  apiKey: string,
): string {
  const params = new URLSearchParams({
    center: `${center.lat},${center.lon}`,
    zoom: String(zoom),
    size: `${size.width}x${size.height}`,
    scale: String(MAP_SCALE),
    language: language === 'he' ? 'iw' : 'en',
    key: apiKey,
  });
  MAP_STYLES.forEach((style) => params.append('style', style));
  return `${STATIC_MAP_URL}?${params.toString()}`;
}

function overlaps(a: Box, b: Box): boolean {
  return a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
}

// Tries spots around the dot (perpendicular to the line first, then farther out) and keeps the first one with the fewest collisions.
function placeLabel(point: Point, direction: Point, width: number, height: number, taken: readonly Box[], bounds: Box): Box {
  const horizontalLine = Math.abs(direction.x) > Math.abs(direction.y);
  const ring = (gap: number) => {
    const right = { left: point.x + gap, top: point.y - height / 2 };
    const left = { left: point.x - gap - width, top: point.y - height / 2 };
    const above = { left: point.x - width / 2, top: point.y - gap - height };
    const below = { left: point.x - width / 2, top: point.y + gap };
    const diagonals = [
      { left: point.x + gap / 2, top: point.y - gap / 2 - height },
      { left: point.x + gap / 2, top: point.y + gap / 2 },
      { left: point.x - gap / 2 - width, top: point.y - gap / 2 - height },
      { left: point.x - gap / 2 - width, top: point.y + gap / 2 },
    ];
    return [...(horizontalLine ? [above, below, right, left] : [right, left, above, below]), ...diagonals];
  };
  const boxes = [...ring(LABEL_GAP), ...ring(LABEL_GAP * 3)].map(({ left: x, top: y }) => ({ left: x, top: y, right: x + width, bottom: y + height }));
  const inside = (box: Box) => box.left >= bounds.left && box.right <= bounds.right && box.top >= bounds.top && box.bottom <= bounds.bottom;
  const collisions = (box: Box) => (inside(box) ? taken.filter((other) => overlaps(box, other)).length : Infinity);
  return boxes.reduce((best, box) => (collisions(box) < collisions(best) ? box : best));
}

function drawHeader(ctx: CanvasRenderingContext2D, language: ImageLanguage, count: number): Box {
  const rtl = language === 'he';
  const { title, subtitle } = LABELS[language];
  ctx.font = font(16);
  const titleWidth = ctx.measureText(title).width;
  ctx.font = font(12);
  const width = Math.max(titleWidth, ctx.measureText(subtitle(count)).width) + 28;
  const box = { left: 12, top: 12, right: 12 + width, bottom: 12 + 56 };
  ctx.fillStyle = 'rgba(255, 255, 255, 0.94)';
  roundRect(ctx, box.left, box.top, width, box.bottom - box.top, 12);
  ctx.fill();
  ctx.fillStyle = LINE_COLOR;
  ctx.fillRect(rtl ? box.right - 6 : box.left, box.top + 12, 6, 32);
  ctx.textAlign = rtl ? 'right' : 'left';
  ctx.textBaseline = 'middle';
  const x = rtl ? box.right - 16 : box.left + 16;
  ctx.font = font(16);
  ctx.fillStyle = '#1b2430';
  ctx.fillText(title, x, box.top + 20);
  ctx.font = font(12);
  ctx.fillStyle = '#6b7785';
  ctx.fillText(subtitle(count), x, box.top + 40);
  return box;
}

export function drawLightRailNetwork(
  ctx: CanvasRenderingContext2D,
  network: LightRailNetwork,
  project: (station: LightRailStation) => Point,
  language: ImageLanguage,
  bounds: Box,
  reserved: readonly Box[],
): void {
  const { stations, edges } = network;
  const used = new Set(edges.flat());
  const points = stations.map(project);

  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const [color, width] of [
    ['#ffffff', 9],
    [LINE_COLOR, 5],
  ] as const) {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    for (const [a, b] of edges) {
      ctx.moveTo(points[a].x, points[a].y);
      ctx.lineTo(points[b].x, points[b].y);
    }
    ctx.stroke();
  }

  const neighbors = stations.map((_, index) => edges.filter((edge) => edge.includes(index)).map(([a, b]) => (a === index ? b : a)));
  const square = ({ x, y }: Point, half: number): Box => ({ left: x - half, top: y - half, right: x + half, bottom: y + half });
  const lineSamples = edges.flatMap(([a, b]) => {
    const steps = Math.ceil(Math.hypot(points[b].x - points[a].x, points[b].y - points[a].y) / 4);
    return Array.from({ length: steps + 1 }, (_, i) => square({ x: points[a].x + ((points[b].x - points[a].x) * i) / steps, y: points[a].y + ((points[b].y - points[a].y) * i) / steps }, 3));
  });
  const taken: Box[] = [...reserved, ...lineSamples, ...[...used].map((i) => square(points[i], 5))];
  const labels: { readonly text: string; readonly box: Box }[] = [];
  ctx.font = font(LABEL_SIZE);
  for (const index of used) {
    const around = neighbors[index].map((other) => points[other]);
    const direction =
      around.length >= 2 ? { x: around[1].x - around[0].x, y: around[1].y - around[0].y } : around.length ? { x: around[0].x - points[index].x, y: around[0].y - points[index].y } : { x: 1, y: 0 };
    const text = language === 'he' ? stations[index].nameHe : stations[index].nameEn;
    const width = ctx.measureText(text).width + LABEL_PADDING * 2;
    const box = placeLabel(points[index], direction, width, LABEL_SIZE + LABEL_PADDING * 2, taken, bounds);
    taken.push(box);
    labels.push({ text, box });
  }

  for (const index of used) {
    drawDot(ctx, points[index].x, points[index].y, '#ffffff', LINE_COLOR, 4);
  }
  for (const { text, box } of labels) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.88)';
    roundRect(ctx, box.left, box.top, box.right - box.left, box.bottom - box.top, 4);
    ctx.fill();
    ctx.font = font(LABEL_SIZE);
    ctx.fillStyle = '#1b2430';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, (box.left + box.right) / 2, (box.top + box.bottom) / 2 + 1);
  }
}

// Google Static Maps base layer with the Red Line, its stations and their names drawn on top. Cached per timetable build and language.
export async function generateLightRailStationMap(timetable: LightRailTimetable, language: ImageLanguage): Promise<Buffer> {
  const cacheKey = `${timetable.builtAt}:${language}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const apiKey = env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) throw new Error('GOOGLE_MAPS_API_KEY is not configured');

  const network = buildLightRailNetwork(timetable);
  const used = [...new Set(network.edges.flat())].map((index) => network.stations[index]);
  if (!used.length) throw new Error('No light rail stations to draw');

  const frame = fitMapFrame(used);
  const tiles = planTiles(frame);
  const baseMaps = await Promise.all(
    tiles.map(async (tile) => {
      const center = fromWorld({ x: frame.origin.x + tile.left + tile.width / 2, y: frame.origin.y + tile.top + tile.height / 2 }, frame.zoom);
      const response = await fetch(buildStaticMapUrl(center, frame.zoom, tile, language, apiKey));
      if (!response.ok) throw new Error(`Static map request failed: ${response.status} ${response.statusText}`);
      return loadImage(Buffer.from(await response.arrayBuffer()));
    }),
  );

  const { canvas, ctx } = createScaledCanvas(frame.width, frame.height);
  baseMaps.forEach((image, i) => ctx.drawImage(image, tiles[i].left, tiles[i].top, tiles[i].width, tiles[i].height));
  const header = drawHeader(ctx, language, used.length);
  const project = (station: LightRailStation): Point => {
    const world = toWorld(station.lat, station.lon, frame.zoom);
    return { x: world.x - frame.origin.x, y: world.y - frame.origin.y };
  };
  drawLightRailNetwork(ctx, network, project, language, { left: 4, top: 4, right: frame.width - 4, bottom: frame.height - 4 }, [header]);

  const image = canvas.toBuffer('image/png');
  cache.set(cacheKey, image);
  return image;
}
