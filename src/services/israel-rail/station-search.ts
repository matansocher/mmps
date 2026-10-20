import { STATION_ALIASES } from './constants';
import { RAIL_STATIONS } from './stations';
import type { RailStation } from './types';

export function normalizeStationName(name: string): string {
  return name
    .toLowerCase()
    .replace(/["'`״׳’‘]/g, '')
    .replace(/[-–—()/.,_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const PUBLIC_STATIONS: readonly RailStation[] = RAIL_STATIONS.map(({ id, nameEn, nameHe }) => ({ id, nameEn, nameHe }));

const SEARCHABLE_STATIONS = PUBLIC_STATIONS.map((station) => {
  const aliases = Object.entries(STATION_ALIASES)
    .filter(([, id]) => id === station.id)
    .map(([alias]) => normalizeStationName(alias));
  const names = [normalizeStationName(station.nameEn), normalizeStationName(station.nameHe)];
  return { station, names, searchText: [...names, ...aliases].join(' | ') };
});

export function getStationById(id: number): RailStation | undefined {
  return PUBLIC_STATIONS.find((station) => station.id === id);
}

// Returns a single station on an exact name/alias hit, otherwise every station whose names contain all query words.
export function findStations(query: string): RailStation[] {
  const normalized = normalizeStationName(query);
  if (!normalized) {
    return [];
  }

  const aliasId = STATION_ALIASES[normalized];
  if (aliasId) {
    return [getStationById(aliasId)];
  }

  const exact = SEARCHABLE_STATIONS.find(({ names }) => names.includes(normalized));
  if (exact) {
    return [exact.station];
  }

  const words = normalized.split(' ');
  return SEARCHABLE_STATIONS.filter(({ searchText }) => words.every((word) => searchText.includes(word))).map(({ station }) => station);
}
