import { RED_LINE_AGENCY_ID, TRAM_ROUTE_TYPE } from './constants';
import type { LightRailServiceCalendar, LightRailStation, LightRailTimetable, LightRailTrip } from './types';

export type GtfsLineReader = (fileName: string) => AsyncIterable<string>;

type Row = Record<string, string>;
type RawStopTime = { readonly stopId: string; readonly sequence: number; readonly departureSec: number };

// MOT files are not RFC 4180 quoted (names contain raw `"`), so a plain split is the correct parse.
async function* readRows(readLines: GtfsLineReader, fileName: string): AsyncGenerator<Row> {
  let header: string[] | null = null;
  for await (const rawLine of readLines(fileName)) {
    const line = rawLine.replace(/^\uFEFF/, '').trimEnd();
    if (!line) continue;
    const values = line.split(',');
    if (!header) {
      header = values;
      continue;
    }
    yield Object.fromEntries(header.map((column, i) => [column, values[i] ?? '']));
  }
}

export function parseGtfsTime(time: string): number {
  const [hours, minutes, seconds] = time.split(':').map(Number);
  return hours * 3600 + minutes * 60 + (seconds || 0);
}

// Hebrew GTFS names use `''` for gershayim while translations.txt uses `"`.
function toDisplayName(stopName: string): string {
  return stopName.replace(/''/g, '"').trim();
}

export async function buildTimetable(readLines: GtfsLineReader, builtAt = Date.now()): Promise<LightRailTimetable> {
  const routeIds = new Set<string>();
  for await (const route of readRows(readLines, 'routes.txt')) {
    if (route.agency_id === RED_LINE_AGENCY_ID && route.route_type === TRAM_ROUTE_TYPE) routeIds.add(route.route_id);
  }
  if (!routeIds.size) throw new Error('No light rail routes found in GTFS feed');

  const tripServices = new Map<string, string>();
  for await (const trip of readRows(readLines, 'trips.txt')) {
    if (routeIds.has(trip.route_id)) tripServices.set(trip.trip_id, trip.service_id);
  }

  const serviceIds = new Set(tripServices.values());
  const services: LightRailServiceCalendar[] = [];
  for await (const row of readRows(readLines, 'calendar.txt')) {
    if (!serviceIds.has(row.service_id)) continue;
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'].map((day) => row[day] === '1');
    services.push({ id: row.service_id, days, startDate: row.start_date, endDate: row.end_date });
  }

  // stop_times.txt is ~1GB, so it is filtered line by line without building row objects for unrelated trips.
  const stopTimes = new Map<string, RawStopTime[]>();
  let columns: Record<string, number> | null = null;
  for await (const rawLine of readLines('stop_times.txt')) {
    const line = rawLine.replace(/^\uFEFF/, '').trimEnd();
    if (!line) continue;
    if (!columns) {
      columns = Object.fromEntries(line.split(',').map((column, i) => [column, i]));
      continue;
    }
    const tripId = line.slice(0, line.indexOf(','));
    if (!tripServices.has(tripId)) continue;
    const values = line.split(',');
    const list = stopTimes.get(tripId) ?? [];
    list.push({ stopId: values[columns.stop_id], sequence: Number(values[columns.stop_sequence]), departureSec: parseGtfsTime(values[columns.departure_time]) });
    stopTimes.set(tripId, list);
  }

  const stopIds = new Set([...stopTimes.values()].flat().map(({ stopId }) => stopId));
  const stopToStation = new Map<string, string>();
  const stationsById = new Map<string, LightRailStation>();
  for await (const stop of readRows(readLines, 'stops.txt')) {
    if (!stopIds.has(stop.stop_id)) continue;
    const stationId = stop.parent_station || stop.stop_id;
    stopToStation.set(stop.stop_id, stationId);
    if (!stationsById.has(stationId)) {
      const nameHe = toDisplayName(stop.stop_name);
      stationsById.set(stationId, { id: stationId, nameHe, nameEn: nameHe, lat: Number(stop.stop_lat), lon: Number(stop.stop_lon) });
    }
  }

  const hebrewNames = new Set([...stationsById.values()].map(({ nameHe }) => nameHe));
  const englishNames = new Map<string, string>();
  for await (const rawLine of readLines('translations.txt')) {
    const [transId, lang, ...rest] = rawLine
      .replace(/^\uFEFF/, '')
      .trimEnd()
      .split(',');
    if (lang === 'EN' && hebrewNames.has(transId.trim())) englishNames.set(transId.trim(), rest.join(',').trim());
  }

  // Order stations along the line using the longest trip, so lists read north to south.
  const sortedTrips = [...stopTimes.entries()].map(([tripId, list]) => [tripId, [...list].sort((a, b) => a.sequence - b.sequence)] as const);
  const longest = [...sortedTrips].sort(([, a], [, b]) => b.length - a.length)[0]?.[1] ?? [];
  const orderedIds = [...new Set([...longest, ...sortedTrips.flatMap(([, list]) => list)].map(({ stopId }) => stopToStation.get(stopId)).filter(Boolean))];
  const stations = orderedIds.map((id) => {
    const station = stationsById.get(id);
    return { ...station, nameEn: englishNames.get(station.nameHe) ?? station.nameHe };
  });
  const stationIndex = new Map(stations.map(({ id }, i) => [id, i]));

  const trips: LightRailTrip[] = sortedTrips.map(([tripId, list]) => ({
    serviceId: tripServices.get(tripId),
    stops: list.map(({ stopId, departureSec }) => [stationIndex.get(stopToStation.get(stopId)), departureSec] as const),
  }));

  return { builtAt, stations, services, trips };
}
