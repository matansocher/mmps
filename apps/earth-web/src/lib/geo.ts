import type { LatLon } from '../types';

export const EARTH_RADIUS_M = 6371008.8;

const toRad = (deg: number) => (deg * Math.PI) / 180;

export function haversineDistance(a: LatLon, b: LatLon): number {
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function pathDistance(points: readonly LatLon[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) total += haversineDistance(points[i - 1], points[i]);
  return total;
}

// Spherical polygon area (open ring) — same formula as turf's ringArea.
export function polygonArea(points: readonly LatLon[]): number {
  const n = points.length;
  if (n < 3) return 0;
  let total = 0;
  for (let i = 0; i < n; i++) {
    const prev = points[(i - 1 + n) % n];
    const curr = points[i];
    const next = points[(i + 1) % n];
    let dLon = toRad(next.lon - prev.lon);
    if (dLon > Math.PI) dLon -= 2 * Math.PI;
    if (dLon < -Math.PI) dLon += 2 * Math.PI;
    total += dLon * Math.sin(toRad(curr.lat));
  }
  return Math.abs((total * EARTH_RADIUS_M * EARTH_RADIUS_M) / 2);
}

export function randomLandishPoint(random: () => number = Math.random): LatLon {
  // Uniform on the sphere, limited to latitudes where most land and imagery live.
  const lat = (Math.asin(2 * random() - 1) * 180) / Math.PI;
  return { lat: Math.max(-56, Math.min(70, lat)), lon: random() * 360 - 180 };
}
