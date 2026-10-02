import type { Country, LatLon, Polygon, Ring } from '../types';

export type BBox = {
  readonly west: number;
  readonly south: number;
  readonly east: number;
  readonly north: number;
};

export type CountryIndex = {
  readonly countries: readonly Country[];
  readonly byCode: ReadonlyMap<string, Country>;
  readonly findAt: (point: LatLon) => Country | null;
};

// Countries smaller than this are drawn but never asked (Vatican, Monaco, Singapore…).
export const MIN_QUESTION_AREA_KM2 = 1000;

export function ringBBox(ring: Ring): BBox {
  let west = Infinity;
  let south = Infinity;
  let east = -Infinity;
  let north = -Infinity;
  for (let i = 0; i < ring.length; i += 2) {
    west = Math.min(west, ring[i]);
    east = Math.max(east, ring[i]);
    south = Math.min(south, ring[i + 1]);
    north = Math.max(north, ring[i + 1]);
  }
  return { west, south, east, north };
}

const inBBox = (box: BBox, { lat, lon }: LatLon) => lon >= box.west && lon <= box.east && lat >= box.south && lat <= box.north;

// Even-odd ray casting on lon/lat. Rings never cross the antimeridian (the source splits them at ±180°).
export function pointInRing({ lat, lon }: LatLon, ring: Ring): boolean {
  let inside = false;
  const n = ring.length / 2;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = ring[i * 2];
    const yi = ring[i * 2 + 1];
    const xj = ring[j * 2];
    const yj = ring[j * 2 + 1];
    if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

export function pointInPolygon(point: LatLon, [outer, ...holes]: Polygon): boolean {
  return pointInRing(point, outer) && !holes.some((hole) => pointInRing(point, hole));
}

export function createCountryIndex(countries: readonly Country[]): CountryIndex {
  // Smallest first: coarse borders leave slivers of overlap, and the microstate should win them.
  const entries = [...countries].sort((a, b) => a.area - b.area).flatMap((country) => country.polygons.map((polygon) => ({ country, polygon, box: ringBBox(polygon[0]) })));
  const findAt = (point: LatLon): Country | null => entries.find(({ box, polygon }) => inBBox(box, point) && pointInPolygon(point, polygon))?.country ?? null;
  return { countries, byCode: new Map(countries.map((c) => [c.code, c])), findAt };
}

const bboxArea = (box: BBox) => (box.east - box.west) * (box.north - box.south);

// Center and size of the country's main landmass, used to frame it with the camera.
export function countryFocus(country: Country): LatLon & { readonly spanKm: number } {
  const main = country.polygons.map((polygon) => ringBBox(polygon[0])).reduce((best, box) => (bboxArea(box) > bboxArea(best) ? box : best));
  const lat = (main.south + main.north) / 2;
  const widthKm = (main.east - main.west) * 111.32 * Math.cos((lat * Math.PI) / 180);
  const heightKm = (main.north - main.south) * 110.57;
  return { lat, lon: (main.west + main.east) / 2, spanKm: Math.max(widthKm, heightKm) };
}

export async function loadCountries(url = `${import.meta.env.BASE_URL}data/countries.json`): Promise<Country[]> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Couldn’t load the map data (${response.status}).`);
  return (await response.json()) as Country[];
}

// Frames several countries at once (a country and its neighbours) by their main landmasses.
export function regionFocus(countries: readonly Country[]): LatLon & { readonly spanKm: number } {
  const boxes = countries.map((country) => country.polygons.map((polygon) => ringBBox(polygon[0])).reduce((best, box) => (bboxArea(box) > bboxArea(best) ? box : best)));
  const west = Math.min(...boxes.map((b) => b.west));
  const east = Math.max(...boxes.map((b) => b.east));
  const south = Math.min(...boxes.map((b) => b.south));
  const north = Math.max(...boxes.map((b) => b.north));
  const lat = (south + north) / 2;
  const widthKm = (east - west) * 111.32 * Math.cos((lat * Math.PI) / 180);
  return { lat, lon: (west + east) / 2, spanKm: Math.max(widthKm, (north - south) * 110.57) };
}
