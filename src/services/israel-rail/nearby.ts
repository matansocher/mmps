import { searchPlaces } from '@services/google-places';
import { estimateWalkingRoute, getDistanceMeters } from '@services/light-rail/nearest';
import { getWalkingRoutes } from '@services/light-rail/walking';
import { nearbyRailStationsCache } from './cache';
import { normalizeStationName } from './station-search';
import { RAIL_STATIONS } from './stations';
import type { NearbyRailStationsResult } from './types';

const NEARBY_CANDIDATES = 3;

export async function findRailStationsNearPoint(point: { readonly lat: number; readonly lon: number }, label?: string): Promise<NearbyRailStationsResult> {
  const candidates = RAIL_STATIONS.map((station) => ({ station, distanceMeters: getDistanceMeters(point, station) }))
    .sort((a, b) => a.distanceMeters - b.distanceMeters)
    .slice(0, NEARBY_CANDIDATES);
  const walking = await getWalkingRoutes(
    point,
    candidates.map(({ station }) => station),
  );
  return {
    origin: { ...point, label },
    stations: candidates
      .map(({ station, distanceMeters }, index) => {
        const route = walking?.[index];
        const { meters, minutes } = route ?? estimateWalkingRoute(distanceMeters);
        return { station, straightLineMeters: distanceMeters, walkingMeters: meters, walkingMinutes: minutes, walkingIsEstimate: !route };
      })
      .sort((a, b) => a.walkingMinutes - b.walkingMinutes || a.straightLineMeters - b.straightLineMeters),
  };
}

// Resolves a free-text place (address, landmark, business) with Google Places, then finds the closest Israel Railways stations to it.
export async function findRailStationsNearPlace(place: string): Promise<NearbyRailStationsResult | null> {
  const cacheKey = `place:${normalizeStationName(place)}`;
  const cached = await nearbyRailStationsCache.get(cacheKey);
  if (cached) return cached;

  const [found] = await searchPlaces(place, { maxResults: 1 });
  if (found?.lat === undefined || found?.lng === undefined) return null;

  const label = found.address ? `${found.name}, ${found.address}` : found.name;
  const result = await findRailStationsNearPoint({ lat: found.lat, lon: found.lng }, label);
  await nearbyRailStationsCache.save(cacheKey, result);
  return result;
}
