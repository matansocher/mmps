import { tool } from '@langchain/core/tools';
import { addMinutes, format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { z } from 'zod';
import { DEFAULT_TIMEZONE } from '@core/config';
import { getErrorMessage, Logger } from '@core/utils';
import { buildRailSearchUrl, findRailStationsNearPlace, findStations, getLeaveByTime, RAIL_STATIONS, searchTrains, STATION_BUFFER_MINUTES } from '@services/israel-rail';
import type { NearbyRailStation, NearbyRailStationsResult, RailStation } from '@services/israel-rail';

const logger = new Logger('IsraelRailTool');

// Beyond this walking time the place is not really "near" the station, so the user needs a bus, light rail or taxi to get there.
const FAR_WALKING_MINUTES = 25;

const schema = z.object({
  action: z
    .enum(['trains', 'nearest_station'])
    .optional()
    .describe('"trains" (default): upcoming trains between two stations or places. "nearest_station": the closest Israel Railways stations to a place'),
  from: z
    .string()
    .optional()
    .describe('trains: origin station name as the user said it, in Hebrew or English (e.g. "סבידור", "Tel Aviv HaHagana", "נתב״ג"). Omit when the user gave a place instead (use fromPlace)'),
  to: z
    .string()
    .optional()
    .describe('trains: destination station name as the user said it, in Hebrew or English (e.g. "חיפה חוף הכרמל", "Jerusalem Navon"). Omit when the user gave a place instead (use toPlace)'),
  fromPlace: z
    .string()
    .optional()
    .describe(
      'trains: where the user is now or starts from, when it is a place/address/landmark rather than a train station, with the city if known (e.g. "קניון עזריאלי", "Rothschild 22 Tel Aviv", "הטכניון חיפה"). The nearest station is used as the origin',
    ),
  toPlace: z
    .string()
    .optional()
    .describe(
      'trains: where the user wants to get to, when it is a place/address/landmark rather than a train station, with the city if known (e.g. "הכותל", "Grand Canyon mall Haifa", "אוניברסיטת בן גוריון"). The nearest station is used as the destination',
    ),
  place: z.string().optional().describe('nearest_station: a place, address or landmark as the user said it, with the city if known (e.g. "דיזנגוף סנטר", "Rothschild 22 Tel Aviv")'),
  date: z.string().optional().describe('trains: travel date in YYYY-MM-DD format, Israel time. Omit for today'),
  time: z.string().optional().describe('trains: earliest departure time in HH:mm (24h) format, Israel time, or the latest arrival time when timeMode is "arrive". Omit for now'),
  timeMode: z
    .enum(['depart', 'arrive'])
    .optional()
    .describe(
      'trains: "depart" (default): trains leaving at or after time. "arrive": the latest trains that arrive by time, when the user must be somewhere by then ("I need to be in Haifa by 9", "להגיע עד 9")',
    ),
  limit: z.number().int().min(1).max(10).optional().describe('trains: how many upcoming trains to return (default 5)'),
});

type Role = 'from' | 'to';
type StationAccess = {
  readonly place: string;
  readonly walkingMinutes: number;
  readonly walkingMeters: number;
  readonly walkingIsEstimate: boolean;
  readonly walkingDirectionsUrl: string;
  readonly farFromStation: boolean;
  readonly otherNearbyStations: { readonly nameEn: string; readonly nameHe: string; readonly walkingMinutes: number }[];
};
type StationResolution = { readonly station?: RailStation; readonly access?: StationAccess; readonly error?: Record<string, unknown> };

function resolveStation(query: string, role: Role): StationResolution {
  const matches = findStations(query);
  if (matches.length === 1) {
    return { station: matches[0] };
  }
  if (matches.length > 1) {
    return { error: { error: `Ambiguous ${role} station "${query}"`, candidates: matches.map(({ nameEn, nameHe }) => ({ nameEn, nameHe })) } };
  }
  return { error: { error: `Unknown ${role} station "${query}"`, allStations: RAIL_STATIONS.map(({ nameEn, nameHe }) => `${nameEn} / ${nameHe}`) } };
}

function buildGoogleMapsWalkingUrl(origin: { readonly lat: number; readonly lon: number }, destination: { readonly lat: number; readonly lon: number }): string {
  const params = new URLSearchParams({ api: '1', origin: `${origin.lat},${origin.lon}`, destination: `${destination.lat},${destination.lon}`, travelmode: 'walking' });
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

async function lookupNearbyStations(place: string): Promise<NearbyRailStationsResult | { readonly error: string }> {
  try {
    const result = await findRailStationsNearPlace(place);
    return result?.stations.length ? result : { error: `Could not find the place "${place}"` };
  } catch (err) {
    logger.error(`Place lookup failed for "${place}": ${getErrorMessage(err)}`);
    return { error: `Place search is unavailable right now, ask the user for a station name instead of "${place}"` };
  }
}

function toAccess(nearby: NearbyRailStationsResult, closest: NearbyRailStation, role: Role): StationAccess {
  const { origin } = nearby;
  return {
    place: origin.label ?? `${origin.lat},${origin.lon}`,
    walkingMinutes: closest.walkingMinutes,
    walkingMeters: closest.walkingMeters,
    walkingIsEstimate: closest.walkingIsEstimate,
    // Walk from the place to the origin station, or from the destination station to the place.
    walkingDirectionsUrl: role === 'from' ? buildGoogleMapsWalkingUrl(origin, closest.station) : buildGoogleMapsWalkingUrl(closest.station, origin),
    farFromStation: closest.walkingMinutes > FAR_WALKING_MINUTES,
    otherNearbyStations: nearby.stations.filter((item) => item !== closest).map(({ station, walkingMinutes }) => ({ nameEn: station.nameEn, nameHe: station.nameHe, walkingMinutes })),
  };
}

async function resolveEndpoint(station: string | undefined, place: string | undefined, role: Role): Promise<StationResolution> {
  if (station?.trim()) {
    return resolveStation(station, role);
  }
  if (!place?.trim()) {
    return { error: { error: `Missing ${role}: provide a ${role} station or a ${role}Place` } };
  }
  const nearby = await lookupNearbyStations(place);
  if ('error' in nearby) {
    return { error: nearby };
  }
  const [closest] = nearby.stations;
  const { id, nameEn, nameHe } = closest.station;
  return { station: { id, nameEn, nameHe }, access: toAccess(nearby, closest, role) };
}

async function nearestStation(place: string | undefined) {
  if (!place?.trim()) {
    return { error: 'Provide a place for nearest_station' };
  }
  const nearby = await lookupNearbyStations(place);
  if ('error' in nearby) {
    return nearby;
  }
  return {
    place: nearby.origin.label ?? place,
    farFromStations: nearby.stations[0].walkingMinutes > FAR_WALKING_MINUTES,
    stations: nearby.stations.map(({ station, walkingMeters, walkingMinutes, walkingIsEstimate }) => ({
      nameHe: station.nameHe,
      nameEn: station.nameEn,
      walkingMinutes,
      walkingMeters,
      walkingIsEstimate,
      walkingDirectionsUrl: buildGoogleMapsWalkingUrl(nearby.origin, station),
    })),
  };
}

async function runner({ action, from, to, fromPlace, toPlace, place, date, time, timeMode, limit }: z.infer<typeof schema>) {
  if (action === 'nearest_station') {
    return nearestStation(place ?? fromPlace ?? toPlace);
  }

  const [origin, destination] = await Promise.all([resolveEndpoint(from, fromPlace, 'from'), resolveEndpoint(to, toPlace, 'to')]);
  if (origin.error) {
    return origin.error;
  }
  if (destination.error) {
    return destination.error;
  }
  if (origin.station.id === destination.station.id) {
    return {
      error: `The origin and destination are both closest to ${origin.station.nameEn} / ${origin.station.nameHe}, so the train does not help here`,
      ...(origin.access && { fromAccess: origin.access }),
      ...(destination.access && { toAccess: destination.access }),
    };
  }

  const arriveBy = timeMode === 'arrive';
  if (arriveBy && !time) {
    return { error: 'timeMode "arrive" needs the time the user must arrive by - ask the user for it' };
  }

  const nowLocal = toZonedTime(new Date(), DEFAULT_TIMEZONE);
  // Leaving now from a place means catching trains after the walk to the station.
  const accessMinutes = origin.access ? origin.access.walkingMinutes + STATION_BUFFER_MINUTES : 0;
  const earliestLocal = addMinutes(nowLocal, date || time ? 0 : accessMinutes);
  const searchDate = date ?? format(earliestLocal, 'yyyy-MM-dd');
  const searchTime = time ?? format(earliestLocal, 'HH:mm');

  const { travels, messages } = await searchTrains({
    fromStationId: origin.station.id,
    toStationId: destination.station.id,
    date: searchDate,
    hour: searchTime,
    scheduleType: arriveBy ? 'arrival' : 'departure',
    limit,
  });
  const walkingMinutes = origin.access && !origin.access.farFromStation ? origin.access.walkingMinutes : undefined;
  const trains = walkingMinutes === undefined ? travels : travels.map((travel) => ({ ...travel, leaveBy: getLeaveByTime(travel.departureTime, walkingMinutes) }));
  // Arrival searches link to the departure-time search of the earliest returned train, which the website shows the same way.
  const [firstTrain] = travels;
  const departureDate = arriveBy && firstTrain ? firstTrain.date : searchDate;
  const departureTime = arriveBy && firstTrain ? firstTrain.departureTime : searchTime;

  return {
    from: origin.station,
    to: destination.station,
    ...(origin.access && { fromAccess: origin.access }),
    ...(destination.access && { toAccess: destination.access }),
    ...(arriveBy && { arriveBy: `${searchDate} ${searchTime}` }),
    searchedFrom: `${departureDate} ${departureTime}`,
    trains,
    alerts: messages,
    railWebsiteUrl: buildRailSearchUrl({ fromStationId: origin.station.id, toStationId: destination.station.id, date: departureDate, time: departureTime }),
  };
}

export const israelRailTool = tool(runner, {
  name: 'israel_rail',
  description: `Get live upcoming Israel Railways trains between two stations or places (real-time data from rail.co.il), including departure/arrival times, platforms, delays, transfers and predicted crowding (action "trains"), or the closest Israel Railways stations to a place (action "nearest_station"). Places are resolved with Google Maps.
Rules:
- Pass station names exactly as the user wrote them (Hebrew or English); the tool resolves them. Convert relative times ("tomorrow at 8", "in an hour", "מחר בבוקר") to date + time in Israel time.
- When the user's origin or destination is a place rather than a train station (an address, landmark, mall, university, hotel, neighbourhood, "I'm at X" / "אני ב...", "I want to get to Y" / "אני רוצה להגיע ל..."), pass it as fromPlace / toPlace instead of from / to, with the city if known. Each side can independently be a station or a place.
- If the result has "candidates" (ambiguous name), ask the user which station they meant, or re-call with the obvious candidate if context makes it clear. If it has "allStations", the name may be a place: re-call with it as fromPlace / toPlace, pick the closest real station, or ask the user.
- Reply format: one line per train: departure → arrival, duration, platform, train number; mention delays (delayMinutes > 0) and crowding only if high (>70%).
- For every train with transfers, ALWAYS include each transfer from transferDetails, without being asked: the transfer station, arrival platform → departure platform, the connecting train number and its departure time, and the wait time.
- Arrive-by: when the user must be somewhere by a time ("I need to be in Haifa by 9", "אני צריך להגיע לחיפה עד 9"), pass timeMode "arrive" with that time. The result has arriveBy and the latest trains arriving by then, in order; recommend the last one and mention the earlier ones as safer options. If trains is empty, say no train arrives by then.
- If the result has fromAccess, start with how to reach the origin station: "walk ~N min (X m) to <station>" with fromAccess.walkingDirectionsUrl as a markdown link ([Walking directions](url) / [הוראות הליכה](url)); when leaving now, the trains already start after that walk.
- Leave-by: when trains have leaveBy, that is when to leave the place to catch the train (the walk plus ${STATION_BUFFER_MINUTES} spare minutes at the station). Show it on each train line ("leave by HH:mm" / "לצאת עד HH:mm") and answer "when should I leave?" / "מתי לצאת?" with it. If it has toAccess, end the train list with the walk from the destination station to the place, with its walkingDirectionsUrl link. If walkingIsEstimate is true, say the walk is approximate ("בערך" / "about"). If farFromStation is true, say it is too far to walk and suggest a bus, the light rail or a taxi to/from that station (mention otherNearbyStations only if useful).
- If the result says both sides are closest to the same station, tell the user the train does not help for this trip and share the walking info.
- A visual route card (timeline with platforms and transfers) of the trains whose departure times you mention is sent automatically right before your reply, so keep the text compact.
- Add any alerts briefly at the end.
- ALWAYS end the reply with railWebsiteUrl as a markdown link (e.g. [Verify on rail.co.il](url) / [לבדיקה באתר הרכבת](url)) so the user can open the same search on the website.
- Use station names in the user's language (nameHe for Hebrew, nameEn for English).
nearest_station rules:
- Use it when the user only asks for the closest / nearest train station to a place ("מה תחנת הרכבת הכי קרובה לטכניון?", "nearest train station to the Azrieli mall"), without a destination.
- Reply with the closest station first: name, walking minutes and distance (meters, or km above 1000), then the other options in one short line each, each with its walkingDirectionsUrl as a markdown link. If farFromStations is true, say it is too far to walk.
- If the user also wants trains from there, call action "trains" with fromPlace (not a second nearest_station).`,
  schema,
});
