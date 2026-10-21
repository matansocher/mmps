import { searchPlaces } from '@services/google-places';
import { normalizeStationName } from '@services/israel-rail';
import { nearbyLightRailCache } from './cache';
import { NEARBY_CANDIDATES } from './constants';
import { estimateWalkingRoute, findNearestLightRailStations } from './nearest';
import type { GeoPoint, LightRailStation, NearbyLightRailResult } from './types';
import { getWalkingRoutes } from './walking';

export async function findLightRailStationsNearPoint(stations: readonly LightRailStation[], point: GeoPoint, label?: string): Promise<NearbyLightRailResult> {
  // ~10m precision, so nearby shared locations reuse the same walking lookup.
  const cacheKey = `point:${point.lat.toFixed(4)},${point.lon.toFixed(4)}`;
  const cached = await nearbyLightRailCache.get(cacheKey);
  if (cached) return { ...cached, origin: { ...point, label } };

  const candidates = findNearestLightRailStations(stations, point, NEARBY_CANDIDATES);
  const walking = await getWalkingRoutes(
    point,
    candidates.map(({ station }) => station),
  );
  const result: NearbyLightRailResult = {
    origin: { ...point, label },
    stations: candidates
      .map(({ station, distanceMeters }, index) => {
        const route = walking?.[index];
        const { meters, minutes } = route ?? estimateWalkingRoute(distanceMeters);
        return { station, straightLineMeters: distanceMeters, walkingMeters: meters, walkingMinutes: minutes, walkingIsEstimate: !route };
      })
      .sort((a, b) => a.walkingMinutes - b.walkingMinutes || a.straightLineMeters - b.straightLineMeters),
  };
  await nearbyLightRailCache.save(cacheKey, result);
  return result;
}

export async function findLightRailStationsNearPlace(stations: readonly LightRailStation[], place: string): Promise<NearbyLightRailResult | null> {
  const cacheKey = `place:${normalizeStationName(place)}`;
  const cached = await nearbyLightRailCache.get(cacheKey);
  if (cached) return cached;

  const [found] = await searchPlaces(place, { maxResults: 1 });
  if (found?.lat === undefined || found?.lng === undefined) return null;

  const label = found.address ? `${found.name}, ${found.address}` : found.name;
  const result = await findLightRailStationsNearPoint(stations, { lat: found.lat, lon: found.lng }, label);
  await nearbyLightRailCache.save(cacheKey, result);
  return result;
}
