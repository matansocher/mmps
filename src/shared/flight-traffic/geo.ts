import type { CountryGeometry } from './types';

type Ring = ReadonlyArray<ReadonlyArray<number>>; // [lon, lat] pairs
type Polygon = ReadonlyArray<Ring>; // outer ring followed by holes

function isPointInRing(lat: number, lon: number, ring: Ring): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [lonI, latI] = ring[i];
    const [lonJ, latJ] = ring[j];
    const crosses = latI > lat !== latJ > lat && lon < ((lonJ - lonI) * (lat - latI)) / (latJ - latI) + lonI;
    if (crosses) {
      inside = !inside;
    }
  }
  return inside;
}

function isPointInPolygon(lat: number, lon: number, polygon: Polygon): boolean {
  const [outer, ...holes] = polygon;
  return !!outer && isPointInRing(lat, lon, outer) && !holes.some((hole) => isPointInRing(lat, lon, hole));
}

export function isPointInGeometry(lat: number, lon: number, geometry: CountryGeometry): boolean {
  switch (geometry.type) {
    case 'Polygon':
      return isPointInPolygon(lat, lon, geometry.coordinates as number[][][]);
    case 'MultiPolygon':
      return (geometry.coordinates as number[][][][]).some((polygon) => isPointInPolygon(lat, lon, polygon));
    default:
      return false;
  }
}
