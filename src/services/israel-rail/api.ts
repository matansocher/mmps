import axios from 'axios';
import { trainSearchCache } from './cache';
import { DEFAULT_TRAINS_LIMIT, RAIL_API_HEADERS, RAIL_API_SEARCH_URL } from './constants';
import { getStationById } from './station-search';
import type { RailApiSearchResponse, RailApiTrain, RailApiTravel, RailStation, SearchTrainsParams, SearchTrainsResult, TrainLeg, TrainScheduleType, TrainTransfer, TrainTravel } from './types';

// API times are Israel local time without offset. Format: "YYYY-MM-DDTHH:mm:ss"
function toTime(apiDateTime: string): string {
  return apiDateTime.slice(11, 16);
}

function minutesBetween(start: string, end: string): number {
  return Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000);
}

function toStation(id: number): RailStation {
  return getStationById(id) ?? { id, nameEn: String(id), nameHe: String(id) };
}

function toLeg(train: RailApiTrain): TrainLeg {
  return {
    trainNumber: train.trainNumber,
    from: toStation(train.orignStation),
    to: toStation(train.destinationStation),
    departureTime: toTime(train.departureTime),
    arrivalTime: toTime(train.arrivalTime),
    originPlatform: train.originPlatform,
    destinationPlatform: train.destPlatform,
    delayMinutes: train.etaDiffTimes?.find((eta) => eta.stationId === train.orignStation)?.difMin ?? 0,
    predictedLoadPercent: train.predictedPctLoad ?? undefined,
    intermediateStops: train.stopStations?.length ?? 0,
  };
}

function toTransfers(trains: readonly RailApiTrain[]): TrainTransfer[] {
  return trains.slice(1).map((nextTrain, index) => {
    const previousTrain = trains[index];
    return {
      station: toStation(nextTrain.orignStation),
      arrivalTime: toTime(previousTrain.arrivalTime),
      arrivalPlatform: previousTrain.destPlatform,
      departureTime: toTime(nextTrain.departureTime),
      departurePlatform: nextTrain.originPlatform,
      waitMinutes: minutesBetween(previousTrain.arrivalTime, nextTrain.departureTime),
      nextTrainNumber: nextTrain.trainNumber,
    };
  });
}

function toTravel(travel: RailApiTravel): TrainTravel {
  return {
    date: travel.departureTime.slice(0, 10),
    departureTime: toTime(travel.departureTime),
    arrivalTime: toTime(travel.arrivalTime),
    durationMinutes: minutesBetween(travel.departureTime, travel.arrivalTime),
    transfers: Math.max(travel.trains.length - 1, 0),
    transferDetails: toTransfers(travel.trains),
    legs: travel.trains.map(toLeg),
  };
}

const inFlightSearches = new Map<string, Promise<SearchTrainsResult>>();

export function buildSearchCacheKey({ fromStationId, toStationId, date, hour, scheduleType = 'departure', limit = DEFAULT_TRAINS_LIMIT }: SearchTrainsParams): string {
  return [fromStationId, toStationId, date, hour.padStart(5, '0'), limit, ...(scheduleType === 'arrival' ? ['arrival'] : [])].join(':');
}

// Serves identical searches from Redis for a few minutes and collapses concurrent identical
// requests into one upstream call.
export async function searchTrains(params: SearchTrainsParams): Promise<SearchTrainsResult> {
  const key = buildSearchCacheKey(params);
  const cached = await trainSearchCache.get(key);
  if (cached) return cached;

  const pending = inFlightSearches.get(key);
  if (pending) return pending;

  const request = fetchTrains(params);
  inFlightSearches.set(key, request);
  try {
    const result = await request;
    await trainSearchCache.save(key, result);
    return result;
  } finally {
    inFlightSearches.delete(key);
  }
}

// The API returns the whole day either way. For arrival searches keep the latest trains that arrive by the requested time.
function selectTravels(travels: readonly RailApiTravel[], startFromIndex: number, requestedDateTime: string, scheduleType: TrainScheduleType, limit: number): RailApiTravel[] {
  if (scheduleType === 'arrival') {
    return travels.filter((travel) => travel.arrivalTime.slice(0, 16) <= requestedDateTime).slice(-limit);
  }
  return travels
    .slice(startFromIndex)
    .filter((travel) => travel.departureTime.slice(0, 16) >= requestedDateTime)
    .slice(0, limit);
}

async function fetchTrains({ fromStationId, toStationId, date, hour, scheduleType = 'departure', limit = DEFAULT_TRAINS_LIMIT }: SearchTrainsParams): Promise<SearchTrainsResult> {
  const body = {
    fromStation: String(fromStationId),
    toStation: String(toStationId),
    date,
    hour,
    scheduleType: scheduleType === 'arrival' ? 'ByArrival' : 'ByDeparture',
    systemType: '2',
    languageId: 'English',
  };

  const { data } = await axios.post<RailApiSearchResponse>(RAIL_API_SEARCH_URL, body, { headers: RAIL_API_HEADERS, timeout: 15000 });
  const { travels = [], startFromIndex = 0 } = data?.result ?? {};
  const requestedDateTime = `${date}T${hour.padStart(5, '0')}`;
  const upcoming = selectTravels(travels, startFromIndex, requestedDateTime, scheduleType, limit);

  const messages = [
    ...new Set(
      upcoming
        .flatMap((travel) => travel.travelMessages ?? [])
        .map((msg) => msg.message?.trim())
        .filter(Boolean),
    ),
  ];

  return { travels: upcoming.map(toTravel), messages };
}
