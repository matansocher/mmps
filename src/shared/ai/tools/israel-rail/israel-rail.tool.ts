import { tool } from '@langchain/core/tools';
import { addMinutes, format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { z } from 'zod';
import { ISRAEL_TIMEZONE } from '@core/config';
import { getErrorMessage, Logger } from '@core/utils';
import {
  buildRailSearchUrl,
  findLastTrains,
  findRailStationsNearPlace,
  findStations,
  getLeaveByTime,
  getServiceDate,
  RAIL_STATIONS,
  searchTrains,
  STATION_BUFFER_MINUTES,
} from '@services/israel-rail';
import type { NearbyRailStation, NearbyRailStationsResult, RailStation, TrainTravel } from '@services/israel-rail';

const logger = new Logger('IsraelRailTool');

// Beyond this walking time the place is not really "near" the station, so the user needs a bus, light rail or taxi to get there.
const FAR_WALKING_MINUTES = 25;

const schema = z.object({
  action: z
    .enum(['trains', 'last_train', 'nearest_station'])
    .optional()
    .describe(
      '"trains" (default): upcoming trains between two stations or places. "last_train": the final trains of the night (until ~04:00, incl. night trains and connections with transfers). "nearest_station": the closest Israel Railways stations to a place',
    ),
  from: z
    .string()
    .optional()
    .describe(
      'trains / last_train: origin station name as the user said it, in Hebrew or English (e.g. "סבידור", "Tel Aviv HaHagana", "נתב״ג"). Omit when the user gave a place instead (use fromPlace)',
    ),
  to: z
    .string()
    .optional()
    .describe(
      'trains / last_train: destination station name as the user said it, in Hebrew or English (e.g. "חיפה חוף הכרמל", "Jerusalem Navon"). Omit when the user gave a place instead (use toPlace)',
    ),
  fromPlace: z
    .string()
    .optional()
    .describe(
      'trains / last_train: where the user is now or starts from, when it is a place/address/landmark rather than a train station, with the city if known (e.g. "קניון עזריאלי", "Rothschild 22 Tel Aviv", "הטכניון חיפה"). The nearest station is used as the origin',
    ),
  toPlace: z
    .string()
    .optional()
    .describe(
      'trains / last_train: where the user wants to get to, when it is a place/address/landmark rather than a train station, with the city if known (e.g. "הכותל", "Grand Canyon mall Haifa", "אוניברסיטת בן גוריון"). The nearest station is used as the destination',
    ),
  place: z.string().optional().describe('nearest_station: a place, address or landmark as the user said it, with the city if known (e.g. "דיזנגוף סנטר", "Rothschild 22 Tel Aviv")'),
  date: z
    .string()
    .optional()
    .describe('trains: travel date in YYYY-MM-DD format, Israel time. Omit for today. last_train: the evening the user asks about ("tonight" = omit, "tomorrow night" = tomorrow\'s date)'),
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

// The per-stop list is only used by the rail bot's "show stops" button, so keep it out of the model's context.
function withoutStops<T extends TrainTravel>(travel: T): T {
  return { ...travel, legs: travel.legs.map((leg) => ({ ...leg, stops: [] })) };
}

type ResolvedTrip = { readonly origin?: StationResolution; readonly destination?: StationResolution; readonly error?: Record<string, unknown> };

async function resolveTrip({ from, to, fromPlace, toPlace }: z.infer<typeof schema>): Promise<ResolvedTrip> {
  const [origin, destination] = await Promise.all([resolveEndpoint(from, fromPlace, 'from'), resolveEndpoint(to, toPlace, 'to')]);
  if (origin.error) {
    return { error: origin.error };
  }
  if (destination.error) {
    return { error: destination.error };
  }
  if (origin.station.id === destination.station.id) {
    return {
      error: {
        error: `The origin and destination are both closest to ${origin.station.nameEn} / ${origin.station.nameHe}, so the train does not help here`,
        ...(origin.access && { fromAccess: origin.access }),
        ...(destination.access && { toAccess: destination.access }),
      },
    };
  }
  return { origin, destination };
}

async function lastTrain({ origin, destination }: ResolvedTrip, date: string | undefined, limit: number | undefined) {
  const nowLocal = toZonedTime(new Date(), ISRAEL_TIMEZONE);
  const serviceDate = date ?? getServiceDate(nowLocal);
  const lastTrains = await findLastTrains({ fromStationId: origin.station.id, toStationId: destination.station.id, date: serviceDate, limit });
  const { lastDirectTrain, hasNightTrains, messages } = lastTrains;
  const walkingMinutes = origin.access && !origin.access.farFromStation ? origin.access.walkingMinutes : undefined;
  const trains = walkingMinutes === undefined ? lastTrains.trains : lastTrains.trains.map((travel) => ({ ...travel, leaveBy: getLeaveByTime(travel.departureTime, walkingMinutes) }));
  const first = trains[0];
  const searchDate = first?.date ?? serviceDate;
  const searchTime = first?.departureTime ?? '20:00';
  const nowKey = format(nowLocal, 'yyyy-MM-dd HH:mm');
  const departed = (travel: { readonly date: string; readonly departureTime: string }) => `${travel.date} ${travel.departureTime}` < nowKey;

  return {
    from: origin.station,
    to: destination.station,
    ...(origin.access && { fromAccess: origin.access }),
    ...(destination.access && { toAccess: destination.access }),
    serviceDate,
    searchedFrom: `${searchDate} ${searchTime}`,
    trains: trains.map(withoutStops),
    ...(lastDirectTrain && { lastDirectTrain: withoutStops(lastDirectTrain) }),
    hasNightTrains,
    lastTrainAlreadyLeft: trains.length > 0 && departed(trains[trains.length - 1]),
    alerts: messages,
    railWebsiteUrl: buildRailSearchUrl({ fromStationId: origin.station.id, toStationId: destination.station.id, date: searchDate, time: searchTime }),
  };
}

async function runner(input: z.infer<typeof schema>) {
  const { action, place, fromPlace, toPlace, date, time, timeMode, limit } = input;
  if (action === 'nearest_station') {
    return nearestStation(place ?? fromPlace ?? toPlace);
  }

  const trip = await resolveTrip(input);
  if (trip.error) {
    return trip.error;
  }
  if (action === 'last_train') {
    return lastTrain(trip, date, limit);
  }

  const arriveBy = timeMode === 'arrive';
  if (arriveBy && !time) {
    return { error: 'timeMode "arrive" needs the time the user must arrive by - ask the user for it' };
  }

  const { origin, destination } = trip;
  const nowLocal = toZonedTime(new Date(), ISRAEL_TIMEZONE);
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
    trains: trains.map(withoutStops),
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
- Reply format: one line per train: departure → arrival, duration, platform, train number, and crowding; mention delays (delayMinutes > 0).
- Crowding: each leg has "crowding" ("quiet" <40%, "moderate" 40-69%, "busy" ≥70% predicted load). A trip is as crowded as its busiest leg. Show it as 🟢 quiet / 🟡 moderate / 🔴 busy (Hebrew: 🟢 עומס נמוך / 🟡 עומס בינוני / 🔴 עומס גבוה). Omit it when a leg has no crowding.
- If the first train is busy and a quieter train leaves soon after (within ~20 min) without a much longer trip, briefly recommend it. If the user asks for a less crowded train, pick the quietest one in the list, or search later times if all are busy.
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
- If the user also wants trains from there, call action "trains" with fromPlace (not a second nearest_station).
last_train rules:
- Use it for "last train" questions ("מתי הרכבת האחרונה מתל אביב לחיפה הלילה?", "last train from Savidor to Haifa tonight"). The night runs until ~04:00, so night trains after midnight count as tonight.
- trains is chronological and its LAST item is the final departure of the night (including connections with transfers). Lead with it: departure → arrival, platform, train number, and every transfer from transferDetails. Then list the other trains briefly as earlier options.
- If lastDirectTrain is present, the final options all need transfers: also mention the last direct train.
- If hasNightTrains is true, say the route has night trains after midnight (the final one is in the list).
- If lastTrainAlreadyLeft is true, say tonight's last train has already left and offer the first trains tomorrow (call action "trains" for tomorrow morning if the user wants).
- Same fromAccess / leaveBy / toAccess rules as "trains": when trains have leaveBy, say when to leave the place to catch the last train.
- If trains is empty, say there are no trains that evening (e.g. Friday evening / Shabbat) and suggest another evening.
- Same railWebsiteUrl link rule as "trains".`,
  schema,
});
