import type { FindDeparturesParams, FindLastDeparturesParams, LightRailDeparture, LightRailServiceCalendar, LightRailTimetable } from './types';

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
