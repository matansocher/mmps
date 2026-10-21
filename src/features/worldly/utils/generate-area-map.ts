import { Canvas, CanvasRenderingContext2D, createCanvas } from 'canvas';
import { Country, State } from '@shared/worldly';
import { simplifyAreaName } from '.';

export type Area = Country | State;

type Ring = number[][];
type Polygon = Ring[];

type Projection = {
  readonly centerLon: number;
  readonly scale: number;
  readonly xy: (lonOffset: number, lat: number) => [number, number];
  readonly toLonLat: (x: number, y: number) => [number, number];
  readonly centerLat: () => number;
};

type Box = {
  readonly cx: number;
  readonly cy: number;
  readonly w: number;
  readonly h: number;
};

const WIDTH = 800;
const HEIGHT = 800;
const D2R = Math.PI / 180;
const FONT_FAMILY = 'sans-serif';

const FIT_RATIO = 0.48;
const FIT_OFFSET_Y = 18;
const MIN_SPAN_DEG = 14;
// Countries get a wider view so neighbours and coastlines give enough context to place them
const COUNTRY_FIT_RATIO = 0.4;
const COUNTRY_MIN_VIEW_DEG = 30;
const COUNTRY_MIN_MARGIN_DEG = 12;
// Per-country view width in degrees, for cases where the size-based rule isn't enough
const COUNTRY_VIEW_OVERRIDES: Record<string, number> = {
  Iceland: 45,
  Kiribati: 70,
  'Marshall Islands': 60,
  Mauritius: 40,
  'New Zealand': 70,
  Seychelles: 45,
};
const MAX_SPAN_DEG = 220;
const MAIN_POLYGON_RATIO = 0.12;
const SMALL_TARGET_PX = 28;

const COLORS = {
  OCEAN_CENTER: '#9fd2f0',
  OCEAN_EDGE: '#5c9cc9',
  GRATICULE: 'rgba(255,255,255,.22)',
  LAND: '#f7f3ea',
  LAND_BORDER: '#c8bea9',
  LAND_SHADOW: 'rgba(10,50,90,.35)',
  TARGET: '#ff5a5f',
  TARGET_GLOW: 'rgba(255,90,95,.55)',
  TARGET_BORDER: '#ffffff',
  PANEL: 'rgba(255,255,255,.92)',
  PANEL_SHADOW: 'rgba(0,0,0,.18)',
  LOCATOR_LAND: '#cfd8e0',
  TEXT: '#1d2b3a',
};

// Locator inset extents in degrees
const WORLD_EXTENT = { lon0: -170, lon1: 190, lat0: -58, lat1: 80 };
const US_EXTENT = { lon0: -170, lon1: -64, lat0: 17, lat1: 70 };

function getPolygons(area: Area): Polygon[] {
  return (area.geometry.type === 'Polygon' ? [area.geometry.coordinates] : area.geometry.coordinates) as Polygon[];
}

function normalizeLon(lon: number): number {
  return ((lon + 540) % 360) - 180;
}

function mercatorY(lat: number): number {
  const clamped = Math.max(-85, Math.min(85, lat)) * D2R;
  return Math.log(Math.tan(Math.PI / 4 + clamped / 2));
}

function inverseMercatorY(y: number): number {
  return (2 * Math.atan(Math.exp(y)) - Math.PI / 2) / D2R;
}

// Unwrap a ring around a reference longitude so areas crossing ±180 (Fiji, Russia) stay contiguous
function unwrapRing(ring: Ring, refLon: number): Ring {
  const out: Ring = [];
  let prev: number = null;
  for (const [lon, lat] of ring) {
    const offset = prev === null ? normalizeLon(lon - refLon) : prev + normalizeLon(lon - refLon - prev);
    out.push([offset, lat]);
    prev = offset;
  }
  return out;
}

function ringArea(ring: Ring): number {
  let sum = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    sum += (ring[j][0] + ring[i][0]) * (ring[j][1] - ring[i][1]);
  }
  return Math.abs(sum / 2);
}

// Drop far-flung overseas bits (e.g. French Guiana for France) when fitting the view
function getMainPolygons(area: Area): Polygon[] {
  const withArea = getPolygons(area).map((polygon) => ({ polygon, area: ringArea(polygon[0]) }));
  const max = Math.max(...withArea.map((p) => p.area));
  return withArea.filter((p) => p.area >= max * MAIN_POLYGON_RATIO).map((p) => p.polygon);
}

function createProjection(centerLon: number, centerY: number, scale: number, originX: number, originY: number): Projection {
  return {
    centerLon,
    scale,
    xy: (lonOffset, lat) => [originX + lonOffset * D2R * scale, originY - (mercatorY(lat) - centerY) * scale],
    toLonLat: (x, y) => [centerLon + (x - originX) / scale / D2R, inverseMercatorY(centerY - (y - originY) / scale)],
    centerLat: () => inverseMercatorY(centerY),
  };
}

// Auto-fit a Mercator projection so the target's main landmass fills about half the frame
function fitProjection(target: Area, isState: boolean): Projection {
  let x0 = Infinity,
    x1 = -Infinity,
    y0 = Infinity,
    y1 = -Infinity;
  for (const polygon of getMainPolygons(target)) {
    for (const [offset, lat] of unwrapRing(polygon[0], target.lon)) {
      const y = mercatorY(lat);
      x0 = Math.min(x0, offset);
      x1 = Math.max(x1, offset);
      y0 = Math.min(y0, y);
      y1 = Math.max(y1, y);
    }
  }
  const spanX = Math.max((x1 - x0) * D2R, 1e-6);
  const spanY = Math.max(y1 - y0, 1e-6);
  let scale = isState ? Math.min((WIDTH * FIT_RATIO) / spanX, (HEIGHT * FIT_RATIO) / spanY, WIDTH / (MIN_SPAN_DEG * D2R)) : WIDTH / getCountryViewSpan(target, Math.max(spanX, spanY));
  scale = Math.max(scale, WIDTH / (MAX_SPAN_DEG * D2R));
  return createProjection(target.lon + (x0 + x1) / 2, (y0 + y1) / 2, scale, WIDTH / 2, HEIGHT / 2 + FIT_OFFSET_Y);
}

function getCountryViewSpan(target: Area, span: number): number {
  const override = COUNTRY_VIEW_OVERRIDES[target.name];
  if (override) {
    return override * D2R;
  }
  return Math.max(COUNTRY_MIN_VIEW_DEG * D2R, span / COUNTRY_FIT_RATIO, span + 2 * COUNTRY_MIN_MARGIN_DEG * D2R);
}

function tracePath(ctx: CanvasRenderingContext2D, area: Area, projection: Projection): void {
  ctx.beginPath();
  for (const polygon of getPolygons(area)) {
    for (const ring of polygon) {
      unwrapRing(ring, projection.centerLon).forEach(([offset, lat], i) => {
        const [x, y] = projection.xy(offset, lat);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.closePath();
    }
  }
}

function getScreenBox(area: Area, projection: Projection): Box {
  let x0 = Infinity,
    x1 = -Infinity,
    y0 = Infinity,
    y1 = -Infinity;
  for (const polygon of getMainPolygons(area)) {
    for (const [offset, lat] of unwrapRing(polygon[0], projection.centerLon)) {
      const [x, y] = projection.xy(offset, lat);
      x0 = Math.min(x0, x);
      x1 = Math.max(x1, x);
      y0 = Math.min(y0, y);
      y1 = Math.max(y1, y);
    }
  }
  return { cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, w: x1 - x0, h: y1 - y0 };
}

function isInViewport(area: Area, projection: Projection, margin = 40): boolean {
  for (const polygon of getPolygons(area)) {
    let x0 = Infinity,
      x1 = -Infinity,
      y0 = Infinity,
      y1 = -Infinity;
    for (const [offset, lat] of unwrapRing(polygon[0], projection.centerLon)) {
      const [x, y] = projection.xy(offset, lat);
      x0 = Math.min(x0, x);
      x1 = Math.max(x1, x);
      y0 = Math.min(y0, y);
      y1 = Math.max(y1, y);
    }
    if (x1 >= -margin && x0 <= WIDTH + margin && y1 >= -margin && y0 <= HEIGHT + margin) {
      return true;
    }
  }
  return false;
}

function roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawOcean(ctx: CanvasRenderingContext2D): void {
  const gradient = ctx.createRadialGradient(WIDTH / 2, HEIGHT / 2, 80, WIDTH / 2, HEIGHT / 2, WIDTH * 0.75);
  gradient.addColorStop(0, COLORS.OCEAN_CENTER);
  gradient.addColorStop(1, COLORS.OCEAN_EDGE);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
}

function drawGraticule(ctx: CanvasRenderingContext2D, projection: Projection, step = 10): void {
  const [lonLeft, latTop] = projection.toLonLat(0, 0);
  const [lonRight, latBottom] = projection.toLonLat(WIDTH, HEIGHT);
  ctx.save();
  ctx.strokeStyle = COLORS.GRATICULE;
  ctx.lineWidth = 1;
  for (let lon = Math.floor(lonLeft / step) * step; lon <= lonRight; lon += step) {
    const [x] = projection.xy(lon - projection.centerLon, 0);
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, HEIGHT);
    ctx.stroke();
  }
  for (let lat = Math.floor(latBottom / step) * step; lat <= latTop; lat += step) {
    const [, y] = projection.xy(0, lat);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(WIDTH, y);
    ctx.stroke();
  }
  ctx.restore();
}

function drawLand(ctx: CanvasRenderingContext2D, areas: Area[], projection: Projection): void {
  ctx.save();
  ctx.shadowColor = COLORS.LAND_SHADOW;
  ctx.shadowBlur = 14;
  ctx.shadowOffsetY = 3;
  ctx.fillStyle = COLORS.LAND;
  areas.forEach((area) => {
    tracePath(ctx, area, projection);
    ctx.fill('evenodd');
  });
  ctx.restore();

  // Second pass without shadow so neighbours' shadows don't darken each other
  ctx.save();
  ctx.fillStyle = COLORS.LAND;
  areas.forEach((area) => {
    tracePath(ctx, area, projection);
    ctx.fill('evenodd');
  });
  ctx.lineJoin = 'round';
  ctx.strokeStyle = COLORS.LAND_BORDER;
  ctx.lineWidth = 1;
  areas.forEach((area) => {
    tracePath(ctx, area, projection);
    ctx.stroke();
  });
  ctx.restore();
}

function drawTarget(ctx: CanvasRenderingContext2D, target: Area, projection: Projection): void {
  ctx.save();
  ctx.shadowColor = COLORS.TARGET_GLOW;
  ctx.shadowBlur = 22;
  ctx.fillStyle = COLORS.TARGET;
  tracePath(ctx, target, projection);
  ctx.fill('evenodd');
  ctx.restore();

  ctx.save();
  ctx.strokeStyle = COLORS.TARGET_BORDER;
  ctx.lineWidth = 2.5;
  ctx.lineJoin = 'round';
  tracePath(ctx, target, projection);
  ctx.stroke();
  ctx.restore();

  // Tiny targets (Vatican, Singapore…) get a ring so they're never invisible
  const box = getScreenBox(target, projection);
  if (Math.max(box.w, box.h) <= SMALL_TARGET_PX) {
    ctx.save();
    ctx.strokeStyle = COLORS.TARGET;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(box.cx, box.cy, 26, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

function drawTitle(ctx: CanvasRenderingContext2D, isState: boolean): void {
  const title = (isState ? 'Which state is this?' : 'Which country is this?').toUpperCase();
  ctx.save();
  ctx.font = `bold 26px ${FONT_FAMILY}`;
  const textWidth = ctx.measureText(title).width;
  ctx.save();
  ctx.shadowColor = COLORS.PANEL_SHADOW;
  ctx.shadowBlur = 16;
  roundRectPath(ctx, 28, 28, textWidth + 48, 54, 27);
  ctx.fillStyle = COLORS.PANEL;
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = COLORS.TEXT;
  ctx.textBaseline = 'middle';
  ctx.fillText(title, 52, 56);
  ctx.restore();
}

function drawLocator(ctx: CanvasRenderingContext2D, areas: Area[], target: Area, isState: boolean): void {
  const [x, y, w, h, radius] = [WIDTH - 228, HEIGHT - 138, 200, 110, 14];
  const extent = isState ? US_EXTENT : WORLD_EXTENT;
  const y0 = mercatorY(extent.lat0);
  const y1 = mercatorY(extent.lat1);
  const scale = Math.min(w / ((extent.lon1 - extent.lon0) * D2R), h / (y1 - y0));
  const projection = createProjection((extent.lon0 + extent.lon1) / 2, (y0 + y1) / 2, scale, x + w / 2, y + h / 2);

  ctx.save();
  roundRectPath(ctx, x, y, w, h, radius);
  ctx.fillStyle = COLORS.PANEL;
  ctx.fill();
  ctx.clip();
  areas.forEach((area) => {
    tracePath(ctx, area, projection);
    ctx.fillStyle = area === target ? COLORS.TARGET : COLORS.LOCATOR_LAND;
    ctx.fill();
  });
  const box = getScreenBox(target, projection);
  ctx.strokeStyle = COLORS.TARGET;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(box.cx, box.cy, Math.max(7, Math.max(box.w, box.h) / 2 + 4), 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  ctx.save();
  roundRectPath(ctx, x, y, w, h, radius);
  ctx.strokeStyle = COLORS.TARGET_BORDER;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
}

function niceKm(km: number): number {
  const power = Math.pow(10, Math.floor(Math.log10(km)));
  return [5, 2, 1].map((m) => m * power).find((value) => value <= km) ?? power;
}

function drawScaleBar(ctx: CanvasRenderingContext2D, projection: Projection): void {
  const [x, y, targetPx] = [44, HEIGHT - 38, 120];
  const kmPerPx = (6371 * Math.cos(projection.centerLat() * D2R)) / projection.scale;
  const km = niceKm(kmPerPx * targetPx);
  const px = km / kmPerPx;

  ctx.save();
  roundRectPath(ctx, 28, HEIGHT - 74, 170, 46, 12);
  ctx.fillStyle = COLORS.PANEL;
  ctx.fill();
  ctx.fillStyle = COLORS.TEXT;
  ctx.strokeStyle = COLORS.TEXT;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, y - 6);
  ctx.lineTo(x, y);
  ctx.lineTo(x + px, y);
  ctx.lineTo(x + px, y - 6);
  ctx.stroke();
  ctx.font = `bold 14px ${FONT_FAMILY}`;
  ctx.textBaseline = 'bottom';
  ctx.fillText(`${km.toLocaleString('en-US')} km`, x, y - 8);
  ctx.restore();
}

// contextAreas are drawn underneath as backdrop (e.g. countries around US states)
export function generateAreaMap(allAreas: Area[], areaName: string, isState = false, contextAreas: Area[] = []): Canvas {
  const area = allAreas.find((c) => simplifyAreaName(c.name) === simplifyAreaName(areaName));
  if (!area?.geometry) {
    return undefined;
  }
  const areas = allAreas.filter((a) => a.geometry);
  const projection = fitProjection(area, isState);
  const backdrop = [...contextAreas.filter((a) => a.geometry), ...areas].filter((a) => isInViewport(a, projection));

  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext('2d');

  drawOcean(ctx);
  drawGraticule(ctx, projection);
  drawLand(ctx, backdrop, projection);
  drawTarget(ctx, area, projection);
  drawTitle(ctx, isState);
  drawLocator(ctx, areas, area, isState);
  drawScaleBar(ctx, projection);

  return canvas;
}
