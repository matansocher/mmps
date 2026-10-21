import { addDays, format, parse } from 'date-fns';
import { searchTrains } from './api';
import type { TrainTravel } from './types';

// A "night" ends before the morning service starts, so night trains after midnight still count as tonight's trains.
export const SERVICE_DAY_END_TIME = '04:00';
const DEFAULT_LAST_TRAINS_LIMIT = 3;
// The rail API returns the whole day, so this only caps an unexpectedly large response.
const FULL_DAY_LIMIT = 200;

export type FindLastTrainsParams = {
  readonly fromStationId: number;
  readonly toStationId: number;
  readonly date: string; // Format: "YYYY-MM-DD" - the service day (the evening the user asks about)
  readonly limit?: number;
};

export type LastTrainsResult = {
  readonly trains: readonly TrainTravel[]; // Chronological, the final departure of the night is last
  readonly lastDirectTrain?: TrainTravel; // Only when the final departures all have transfers
  readonly hasNightTrains: boolean; // Some departures are after midnight
  readonly messages: readonly string[];
};

export function getNextDate(date: string): string {
  return format(addDays(parse(date, 'yyyy-MM-dd', new Date()), 1), 'yyyy-MM-dd');
}

// The service day a moment belongs to: before 04:00 it is still the previous evening.
export function getServiceDate(dateTime: Date): string {
  const date = format(dateTime, 'yyyy-MM-dd');
  return format(dateTime, 'HH:mm') < SERVICE_DAY_END_TIME ? format(addDays(dateTime, -1), 'yyyy-MM-dd') : date;
}

export function pickLastTrains(travels: readonly TrainTravel[], date: string, limit = DEFAULT_LAST_TRAINS_LIMIT): Omit<LastTrainsResult, 'messages'> {
  const nextDate = getNextDate(date);
  const tonight = travels
    .filter((travel) => (travel.date === date && travel.departureTime >= SERVICE_DAY_END_TIME) || (travel.date === nextDate && travel.departureTime < SERVICE_DAY_END_TIME))
    .sort((a, b) => `${a.date} ${a.departureTime}`.localeCompare(`${b.date} ${b.departureTime}`));

  const trains = tonight.slice(-limit);
  const lastDirect = trains.some((travel) => travel.transfers === 0) ? undefined : [...tonight].reverse().find((travel) => travel.transfers === 0);
  return {
    trains,
    ...(lastDirect && { lastDirectTrain: lastDirect }),
    hasNightTrains: tonight.some((travel) => travel.date === nextDate),
  };
}

export async function findLastTrains({ fromStationId, toStationId, date, limit }: FindLastTrainsParams): Promise<LastTrainsResult> {
  const [evening, night] = await Promise.all([
    searchTrains({ fromStationId, toStationId, date, hour: SERVICE_DAY_END_TIME, limit: FULL_DAY_LIMIT }),
    searchTrains({ fromStationId, toStationId, date: getNextDate(date), hour: '00:00', limit: FULL_DAY_LIMIT }),
  ]);
  return { ...pickLastTrains([...evening.travels, ...night.travels], date, limit), messages: [...new Set([...evening.messages, ...night.messages])] };
}
