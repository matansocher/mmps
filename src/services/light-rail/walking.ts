import axios from 'axios';
import { env } from 'node:process';
import { getErrorMessage, Logger } from '@core/utils';
import { ROUTE_MATRIX_TIMEOUT_MS, ROUTE_MATRIX_URL } from './constants';
import type { GeoPoint, WalkingRoute } from './types';

const logger = new Logger('LightRailWalking');

type RouteMatrixElement = {
  readonly destinationIndex?: number;
  readonly distanceMeters?: number;
  readonly duration?: string; // Format: "123s"
  readonly condition?: string;
};

function toWaypoint({ lat, lon }: GeoPoint) {
  return { waypoint: { location: { latLng: { latitude: lat, longitude: lon } } } };
}

// Returns one walking route per destination (same order), or null when the Routes API is unavailable.
export async function getWalkingRoutes(origin: GeoPoint, destinations: readonly GeoPoint[]): Promise<(WalkingRoute | null)[] | null> {
  const apiKey = env.GOOGLE_MAPS_API_KEY || env.GOOGLE_PLACES_API_KEY;
  if (!apiKey || !destinations.length) return null;
  try {
    const { data } = await axios.post<RouteMatrixElement[]>(
      ROUTE_MATRIX_URL,
      { origins: [toWaypoint(origin)], destinations: destinations.map(toWaypoint), travelMode: 'WALK' },
      { headers: { 'X-Goog-Api-Key': apiKey, 'X-Goog-FieldMask': 'destinationIndex,distanceMeters,duration,condition' }, timeout: ROUTE_MATRIX_TIMEOUT_MS },
    );
    const routes: (WalkingRoute | null)[] = destinations.map(() => null);
    for (const element of data ?? []) {
      const seconds = parseInt(element.duration ?? '', 10);
      if (element.condition !== 'ROUTE_EXISTS' || element.destinationIndex === undefined || !Number.isFinite(seconds)) continue;
      routes[element.destinationIndex] = { meters: element.distanceMeters ?? 0, minutes: Math.max(1, Math.round(seconds / 60)) };
    }
    return routes;
  } catch (err) {
    logger.warn(`Walking routes lookup failed, using estimates: ${getErrorMessage(err)}`);
    return null;
  }
}
