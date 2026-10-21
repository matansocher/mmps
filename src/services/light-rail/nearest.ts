import { WALKING_DETOUR_FACTOR, WALKING_METERS_PER_MINUTE } from './constants';
import type { GeoPoint, LightRailStation, WalkingRoute } from './types';

const EARTH_RADIUS_METERS = 6_371_000;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export function getDistanceMeters(a: GeoPoint, b: GeoPoint): number {
  const dLat = toRadians(b.lat - a.lat);
  const dLon = toRadians(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRadians(a.lat)) * Math.cos(toRadians(b.lat)) * Math.sin(dLon / 2) ** 2;
  return Math.round(2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(h)));
}

export function estimateWalkingRoute(straightLineMeters: number): WalkingRoute {
  const meters = Math.round(straightLineMeters * WALKING_DETOUR_FACTOR);
  return { meters, minutes: Math.max(1, Math.round(meters / WALKING_METERS_PER_MINUTE)) };
}

export function findNearestLightRailStations(stations: readonly LightRailStation[], point: GeoPoint, limit = 3): { readonly station: LightRailStation; readonly distanceMeters: number }[] {
  const seenNames = new Set<string>();
  return stations
    .map((station) => ({ station, distanceMeters: getDistanceMeters(point, station) }))
    .sort((a, b) => a.distanceMeters - b.distanceMeters)
    .filter(({ station }) => {
      if (seenNames.has(station.nameHe)) return false;
      seenNames.add(station.nameHe);
      return true;
    })
    .slice(0, limit);
}
