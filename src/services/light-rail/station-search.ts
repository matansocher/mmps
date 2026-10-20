import { normalizeStationName } from '@services/israel-rail';
import { LIGHT_RAIL_STATION_ALIASES } from './constants';
import type { LightRailStation } from './types';

function getSearchNames(station: LightRailStation): string[] {
  const nameHe = normalizeStationName(station.nameHe);
  const aliases = LIGHT_RAIL_STATION_ALIASES[nameHe] ?? [];
  return [nameHe, normalizeStationName(station.nameEn), ...aliases.map(normalizeStationName)];
}

// Returns a single station on an exact name/alias hit, otherwise every station whose names contain all query words.
export function findLightRailStations(stations: readonly LightRailStation[], query: string): LightRailStation[] {
  const normalized = normalizeStationName(query);
  if (!normalized) return [];

  const searchable = stations.map((station) => ({ station, names: getSearchNames(station) }));
  const exact = searchable.find(({ names }) => names.includes(normalized));
  if (exact) return [exact.station];

  const words = normalized.split(' ');
  return searchable.filter(({ names }) => words.every((word) => names.some((name) => name.includes(word)))).map(({ station }) => station);
}
