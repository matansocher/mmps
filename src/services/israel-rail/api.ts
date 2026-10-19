import axios from 'axios';
import { DEFAULT_TRAINS_LIMIT, RAIL_API_HEADERS, RAIL_API_SEARCH_URL } from './constants';
import { getStationById } from './station-search';
import type { RailApiSearchResponse, RailApiTrain, RailApiTravel, RailStation, SearchTrainsParams, SearchTrainsResult, TrainLeg, TrainTravel } from './types';

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

function toTravel(travel: RailApiTravel): TrainTravel {
  return {
    date: travel.departureTime.slice(0, 10),
    departureTime: toTime(travel.departureTime),
    arrivalTime: toTime(travel.arrivalTime),
    durationMinutes: minutesBetween(travel.departureTime, travel.arrivalTime),
    transfers: Math.max(travel.trains.length - 1, 0),
    legs: travel.trains.map(toLeg),
  };
}

export async function searchTrains({ fromStationId, toStationId, date, hour, limit = DEFAULT_TRAINS_LIMIT }: SearchTrainsParams): Promise<SearchTrainsResult> {
  const body = {
    fromStation: String(fromStationId),
    toStation: String(toStationId),
    date,
    hour,
    scheduleType: 'ByDeparture',
    systemType: '2',
    languageId: 'English',
  };

  const { data } = await axios.post<RailApiSearchResponse>(RAIL_API_SEARCH_URL, body, { headers: RAIL_API_HEADERS, timeout: 15000 });
  const { travels = [], startFromIndex = 0 } = data?.result ?? {};
  const requestedDateTime = `${date}T${hour.padStart(5, '0')}`;
  const upcoming = travels
    .slice(startFromIndex)
    .filter((travel) => travel.departureTime.slice(0, 16) >= requestedDateTime)
    .slice(0, limit);

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
