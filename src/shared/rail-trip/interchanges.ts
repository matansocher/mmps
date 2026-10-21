import type { RailStationWithLocation } from '@services/israel-rail';
import { estimateWalkingRoute, getDistanceMeters } from '@services/light-rail';
import type { LightRailStation } from '@services/light-rail';
import type { RailTripInterchange } from './types';

export const INTERCHANGE_MAX_METERS = 400;

export function findRailTripInterchanges(railStations: readonly RailStationWithLocation[], lightRailStations: readonly LightRailStation[], maxMeters = INTERCHANGE_MAX_METERS): RailTripInterchange[] {
  return railStations
    .map((railStation) => {
      const [nearest] = lightRailStations
        .map((lightRailStation) => ({ lightRailStation, straightLineMeters: getDistanceMeters(railStation, lightRailStation) }))
        .sort((a, b) => a.straightLineMeters - b.straightLineMeters);
      return nearest ? { railStation, ...nearest } : undefined;
    })
    .filter((candidate) => candidate && candidate.straightLineMeters <= maxMeters)
    .map(({ railStation, lightRailStation, straightLineMeters }) => {
      const { meters, minutes } = estimateWalkingRoute(straightLineMeters);
      return { lightRailStation, railStation, straightLineMeters, walkingMeters: meters, walkingMinutes: minutes };
    });
}
