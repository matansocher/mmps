import axios from 'axios';
import { trainSearchCache } from './cache';
import { DEFAULT_TRAINS_LIMIT, RAIL_API_HEADERS, RAIL_API_SEARCH_URL } from './constants';
import { getCrowdingLevel } from './crowding';
import { getStationById } from './station-search';
import type {
  GetTrainLineParams,
  RailApiSearchResponse,
  RailApiTrain,
  RailApiTravel,
  RailStation,
  SearchTrainsParams,
  SearchTrainsResult,
  TrainLeg,
  TrainLine,
  TrainLineStop,
  TrainScheduleType,
  TrainTransfer,
  TrainTravel,
} from './types';

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
  const delayMinutes = train.etaDiffTimes?.find((eta) => eta.stationId === train.orignStation)?.difMin ?? 0;
  return {
    trainNumber: train.trainNumber,
    from: toStation(train.orignStation),
    to: toStation(train.destinationStation),
    departureTime: toTime(train.departureTime),
    arrivalTime: toTime(train.arrivalTime),
    originPlatform: train.originPlatform,
    destinationPlatform: train.destPlatform,
    delayMinutes,
    // A delay at the origin usually carries on to the destination when the API has no prediction for it.
    arrivalDelayMinutes: train.etaDiffTimes?.find((eta) => eta.stationId === train.destinationStation)?.difMin ?? delayMinutes,
    predictedLoadPercent: train.predictedPctLoad ?? undefined,
    crowding: getCrowdingLevel(train.predictedPctLoad ?? undefined),
    intermediateStops: train.stopStations?.length ?? 0,
    stops: (train.stopStations ?? []).map((stop) => ({
      station: toStation(stop.stationId),
      arrivalTime: toTime(stop.arrivalTime),
      departureTime: toTime(stop.departureTime),
      platform: stop.platform,
    })),
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

async function requestTravels({ fromStationId, toStationId, date, hour, scheduleType = 'departure', limit = DEFAULT_TRAINS_LIMIT }: SearchTrainsParams): Promise<RailApiTravel[]> {
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
  return selectTravels(travels, startFromIndex, requestedDateTime, scheduleType, limit);
}

async function fetchTrains(params: SearchTrainsParams): Promise<SearchTrainsResult> {
  const upcoming = await requestTravels(params);
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

function toTrainLine(train: RailApiTrain, date: string): TrainLine {
  const routeStations = train.routeStations ?? [];
  const stops: TrainLineStop[] = routeStations.length
    ? routeStations.map((stop) => ({ station: toStation(stop.stationId), time: stop.arrivalTime, platform: stop.platform }))
    : [
        { station: toStation(train.orignStation), time: toTime(train.departureTime), platform: train.originPlatform },
        ...(train.stopStations ?? []).map((stop) => ({ station: toStation(stop.stationId), time: toTime(stop.arrivalTime), platform: stop.platform })),
        { station: toStation(train.destinationStation), time: toTime(train.arrivalTime), platform: train.destPlatform },
      ];
  const position = train.trainPosition;
  return {
    trainNumber: train.trainNumber,
    date,
    stops,
    boardingStationId: train.orignStation,
    alightingStationId: train.destinationStation,
    position: position?.currentLastStation ? { lastStationId: position.currentLastStation, nextStationId: position.nextStation || null, delayMinutes: position.calcDiffMinutes ?? 0 } : null,
  };
}

// Not cached: the live train position is the whole point of this lookup.
export async function getTrainLine({ fromStationId, toStationId, date, hour, trainNumber }: GetTrainLineParams): Promise<TrainLine | null> {
  const travels = await requestTravels({ fromStationId, toStationId, date, hour });
  const train = travels.flatMap((travel) => travel.trains).find((t) => t.trainNumber === trainNumber);
  return train ? toTrainLine(train, train.departureTime.slice(0, 10)) : null;
}
