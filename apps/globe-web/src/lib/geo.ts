import type { HintTemperature } from '../types';

const EARTH_RADIUS_KM = 6371;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

// Great-circle distance between two lat/lon points, in kilometers.
export function haversineKm(aLat: number, aLon: number, bLat: number, bLon: number): number {
  const dLat = toRad(bLat - aLat);
  const dLon = toRad(bLon - aLon);
  const lat1 = toRad(aLat);
  const lat2 = toRad(bLat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

// Bucket a distance into a hot/cold temperature for player feedback.
export function temperatureFor(distanceKm: number): HintTemperature {
  if (distanceKm < 500) return 'boiling';
  if (distanceKm < 1500) return 'hot';
  if (distanceKm < 3500) return 'warm';
  if (distanceKm < 7000) return 'cold';
  return 'freezing';
}

export const TEMPERATURE_META: Record<HintTemperature, { readonly label: string; readonly emoji: string; readonly color: string }> = {
  boiling: { label: 'Boiling', emoji: '🔥', color: '#FF5470' },
  hot: { label: 'Hot', emoji: '🌶️', color: '#FF8A3D' },
  warm: { label: 'Warm', emoji: '☀️', color: '#FFC24B' },
  cold: { label: 'Cold', emoji: '❄️', color: '#5FB0FF' },
  freezing: { label: 'Freezing', emoji: '🧊', color: '#8FD0FF' },
};

export function formatDistance(km: number): string {
  if (km < 1000) return `${Math.round(km / 10) * 10} km`;
  return `${(km / 1000).toFixed(1)}k km`;
}
