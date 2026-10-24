import type {
  FindDeparturesParams,
  FindDirectionalDeparturesParams,
  FindLastDeparturesParams,
  LightRailDeparture,
  LightRailDirectionDepartures,
  LightRailServiceCalendar,
  LightRailStation,
  LightRailTimetable,
  LightRailTrip,
} from './types';

const DAY_SECONDS = 24 * 60 * 60;
const DEFAULT_LIMIT = 5;

function shiftDate(date: string, days: number): Date {
  const result = new Date(`${date}T00:00:00Z`);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function isServiceActive(service: LightRailServiceCalendar, date: Date): boolean {
  const dateKey = toIsoDate(date).replace(/-/g, '');
  return service.days[date.getUTCDay()] && service.startDate <= dateKey && dateKey <= service.endDate;
}

function formatClock(totalSeconds: number): string {
  const minutesOfDay = Math.floor((((totalSeconds % DAY_SECONDS) + DAY_SECONDS) % DAY_SECONDS) / 60);
  return `${String(Math.floor(minutesOfDay / 60)).padStart(2, '0')}:${String(minutesOfDay % 60).padStart(2, '0')}`;
}

// Trips are scheduled on a service day but can run past midnight (GTFS times > 24:00), so the previous,
// requested and next service days are all scanned and times are compared relative to the requested date.
export function findLightRailDepartures(timetable: LightRailTimetable, { fromStationId, toStationId, date, time, limit = DEFAULT_LIMIT }: FindDeparturesParams): LightRailDeparture[] {
  if (fromStationId === toStationId) throw new Error('Origin and destination stations must be different');
  const fromIndex = timetable.stations.findIndex(({ id }) => id === fromStationId);
  const toIndex = timetable.stations.findIndex(({ id }) => id === toStationId);
  if (fromIndex === -1 || toIndex === -1) throw new Error('Unknown light rail station');

  const [hours, minutes] = time.split(':').map(Number);
  const requestedSec = hours * 3600 + minutes * 60;
  const servicesById = new Map(timetable.services.map((service) => [service.id, service]));
  const candidates: { readonly departureSec: number; readonly arrivalSec: number; readonly stopsCount: number; readonly terminusIndex: number }[] = [];

  for (const dayOffset of [-1, 0, 1]) {
    const serviceDate = shiftDate(date, dayOffset);
    const offsetSec = dayOffset * DAY_SECONDS;
    for (const trip of timetable.trips) {
      const service = servicesById.get(trip.serviceId);
      if (!service || !isServiceActive(service, serviceDate)) continue;
      const originPos = trip.stops.findIndex(([stationIndex]) => stationIndex === fromIndex);
      if (originPos === -1) continue;
      const destinationPos = trip.stops.findIndex(([stationIndex], i) => i > originPos && stationIndex === toIndex);
      if (destinationPos === -1) continue;
      const departureSec = trip.stops[originPos][1] + offsetSec;
      if (departureSec < requestedSec) continue;
      candidates.push({ departureSec, arrivalSec: trip.stops[destinationPos][1] + offsetSec, stopsCount: destinationPos - originPos, terminusIndex: trip.stops[trip.stops.length - 1][0] });
    }
  }

  return candidates
    .sort((a, b) => a.departureSec - b.departureSec)
    .slice(0, limit)
    .map(({ departureSec, arrivalSec, stopsCount, terminusIndex }) => ({
      date: toIsoDate(shiftDate(date, Math.floor(departureSec / DAY_SECONDS))),
      departureTime: formatClock(departureSec),
      arrivalTime: formatClock(arrivalSec),
      durationMinutes: Math.floor(arrivalSec / 60) - Math.floor(departureSec / 60),
      stopsCount,
      terminus: timetable.stations[terminusIndex],
    }));
}

// A "night" ends before the morning service starts, so trips after midnight still count as tonight's trips.
const SERVICE_DAY_END_TIME = '04:00';
const DEFAULT_LAST_LIMIT = 3;

export function findLastLightRailDepartures(timetable: LightRailTimetable, { fromStationId, toStationId, date, limit = DEFAULT_LAST_LIMIT }: FindLastDeparturesParams): LightRailDeparture[] {
  const nextDate = toIsoDate(shiftDate(date, 1));
  const departures = findLightRailDepartures(timetable, { fromStationId, toStationId, date, time: SERVICE_DAY_END_TIME, limit: Number.MAX_SAFE_INTEGER });
  return departures.filter((departure) => departure.date === date || (departure.date === nextDate && departure.departureTime < SERVICE_DAY_END_TIME)).slice(-limit);
}

// Groups the next departures from a station by direction (the next stop), labelled with the farthest terminus that direction reaches.
// Station indexes are not a reliable line order because of the Kiryat Arye branch, so they are not used to tell directions apart.
export function findLightRailDeparturesByDirection(
  timetable: LightRailTimetable,
  { fromStationId, date, time, limit = DEFAULT_LIMIT }: FindDirectionalDeparturesParams,
): LightRailDirectionDepartures[] {
  const fromIndex = timetable.stations.findIndex(({ id }) => id === fromStationId);
  if (fromIndex === -1) throw new Error('Unknown light rail station');

  const [hours, minutes] = time.split(':').map(Number);
  const requestedSec = hours * 3600 + minutes * 60;
  const servicesById = new Map(timetable.services.map((service) => [service.id, service]));
  const candidates = new Map<number, { readonly departureSec: number; readonly terminusIndex: number; readonly remainingStops: number }[]>();

  for (const dayOffset of [-1, 0, 1]) {
    const serviceDate = shiftDate(date, dayOffset);
    const offsetSec = dayOffset * DAY_SECONDS;
    for (const trip of timetable.trips) {
      const service = servicesById.get(trip.serviceId);
      if (!service || !isServiceActive(service, serviceDate)) continue;
      const originPos = trip.stops.findIndex(([stationIndex]) => stationIndex === fromIndex);
      if (originPos === -1 || originPos === trip.stops.length - 1) continue;
      const departureSec = trip.stops[originPos][1] + offsetSec;
      if (departureSec < requestedSec) continue;
      const nextStationIndex = trip.stops[originPos + 1][0];
      const group = candidates.get(nextStationIndex) ?? [];
      group.push({ departureSec, terminusIndex: trip.stops[trip.stops.length - 1][0], remainingStops: trip.stops.length - 1 - originPos });
      candidates.set(nextStationIndex, group);
    }
  }

  return [...candidates.values()]
    .map((group) => ({ group, towardsIndex: group.reduce((farthest, item) => (item.remainingStops > farthest.remainingStops ? item : farthest)).terminusIndex }))
    .sort((a, b) => a.towardsIndex - b.towardsIndex)
    .map(({ group, towardsIndex }) => ({
      towards: timetable.stations[towardsIndex],
      departures: group
        .sort((a, b) => a.departureSec - b.departureSec)
        .slice(0, limit)
        .map(({ departureSec, terminusIndex }) => ({
          date: toIsoDate(shiftDate(date, Math.floor(departureSec / DAY_SECONDS))),
          departureTime: formatClock(departureSec),
          terminus: timetable.stations[terminusIndex],
        })),
    }));
}

function servesInOrder(trip: LightRailTrip, fromIndex: number, toIndex: number): boolean {
  const originPos = trip.stops.findIndex(([stationIndex]) => stationIndex === fromIndex);
  return originPos !== -1 && trip.stops.some(([stationIndex], i) => i > originPos && stationIndex === toIndex);
}

// Some station pairs have no direct trip (e.g. Kiryat Arye -> Petah Tikva Central, which are on different branches).
export function hasDirectLightRailTrip(timetable: LightRailTimetable, fromStationId: string, toStationId: string): boolean {
  const fromIndex = timetable.stations.findIndex(({ id }) => id === fromStationId);
  const toIndex = timetable.stations.findIndex(({ id }) => id === toStationId);
  return timetable.trips.some((trip) => servesInOrder(trip, fromIndex, toIndex));
}

// The first station along a trip from the origin where a direct trip to the destination can be caught.
export function findLightRailInterchange(timetable: LightRailTimetable, fromStationId: string, toStationId: string): LightRailStation | null {
  const fromIndex = timetable.stations.findIndex(({ id }) => id === fromStationId);
  const toIndex = timetable.stations.findIndex(({ id }) => id === toStationId);
  let best: { readonly stationIndex: number; readonly stopsAway: number } | null = null;
  for (const trip of timetable.trips) {
    const originPos = trip.stops.findIndex(([stationIndex]) => stationIndex === fromIndex);
    if (originPos === -1) continue;
    for (let pos = originPos + 1; pos < trip.stops.length; pos++) {
      const stationIndex = trip.stops[pos][0];
      if (best && pos - originPos >= best.stopsAway) break;
      if (timetable.trips.some((other) => servesInOrder(other, stationIndex, toIndex))) {
        best = { stationIndex, stopsAway: pos - originPos };
        break;
      }
    }
  }
  return best ? timetable.stations[best.stationIndex] : null;
}
