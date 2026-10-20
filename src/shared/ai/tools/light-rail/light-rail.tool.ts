import { tool } from '@langchain/core/tools';
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { z } from 'zod';
import { DEFAULT_TIMEZONE } from '@core/config';
import { findLightRailDepartures, findLightRailStations, findLightRailStationsNearPlace, findLightRailStationsNearPoint, getLightRailTimetable } from '@services/light-rail';
import type { GeoPoint, LightRailStation, LightRailTimetable } from '@services/light-rail';

// Beyond this walking time the place is not really "near" the Red Line.
const FAR_WALKING_MINUTES = 25;

const schema = z.object({
  action: z
    .enum(['departures', 'nearest_station'])
    .optional()
    .describe('"departures" (default): upcoming trips between two stations. "nearest_station": the closest Red Line stations to a place or coordinates'),
  from: z.string().optional().describe('departures: origin Red Line station name as the user said it, in Hebrew or English (e.g. "ארלוזורוב", "Allenby", "קריית אריה")'),
  to: z.string().optional().describe('departures: destination Red Line station name as the user said it, in Hebrew or English (e.g. "אלנבי", "Petah Tikva Central Station", "הקוממיות")'),
  place: z.string().optional().describe('nearest_station: a place, address or landmark as the user said it, with the city if known (e.g. "דיזנגוף סנטר", "Rothschild 22 Tel Aviv", "קניון עזריאלי")'),
  lat: z.number().optional().describe('nearest_station: latitude of a location the user shared (use instead of place)'),
  lon: z.number().optional().describe('nearest_station: longitude of a location the user shared (use instead of place)'),
  date: z.string().optional().describe('Travel date in YYYY-MM-DD format, Israel time. Omit for today'),
  time: z.string().optional().describe('Earliest departure time in HH:mm (24h) format, Israel time. Omit for now'),
  limit: z.number().int().min(1).max(10).optional().describe('How many upcoming departures to return (default 5)'),
});

type StationResolution = { readonly station?: LightRailStation; readonly error?: Record<string, unknown> };

function resolveStation(stations: readonly LightRailStation[], query: string, role: 'from' | 'to'): StationResolution {
  const matches = findLightRailStations(stations, query);
  if (matches.length === 1) {
    return { station: matches[0] };
  }
  if (matches.length > 1) {
    return { error: { error: `Ambiguous ${role} station "${query}"`, candidates: matches.map(({ nameEn, nameHe }) => ({ nameEn, nameHe })) } };
  }
  return { error: { error: `Unknown ${role} station "${query}"`, allStations: stations.map(({ nameEn, nameHe }) => `${nameEn} / ${nameHe}`) } };
}

function buildGoogleMapsTransitUrl(origin: LightRailStation, destination: LightRailStation): string {
  const params = new URLSearchParams({ api: '1', origin: `${origin.lat},${origin.lon}`, destination: `${destination.lat},${destination.lon}`, travelmode: 'transit' });
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

function buildGoogleMapsWalkingUrl(origin: GeoPoint, station: LightRailStation): string {
  const params = new URLSearchParams({ api: '1', origin: `${origin.lat},${origin.lon}`, destination: `${station.lat},${station.lon}`, travelmode: 'walking' });
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

async function nearestStation(timetable: LightRailTimetable, { place, lat, lon }: z.infer<typeof schema>) {
  const hasPoint = typeof lat === 'number' && typeof lon === 'number';
  if (!hasPoint && !place?.trim()) {
    return { error: 'Provide a place or lat/lon for nearest_station' };
  }
  const result = hasPoint ? await findLightRailStationsNearPoint(timetable.stations, { lat, lon }) : await findLightRailStationsNearPlace(timetable.stations, place);
  if (!result) {
    return { error: `Could not find the place "${place}"` };
  }

  const stations = result.stations.map(({ station, walkingMeters, walkingMinutes, walkingIsEstimate }) => ({
    nameHe: station.nameHe,
    nameEn: station.nameEn,
    walkingMinutes,
    walkingMeters,
    walkingIsEstimate,
    walkingDirectionsUrl: buildGoogleMapsWalkingUrl(result.origin, station),
  }));
  return {
    line: 'Red Line (הקו האדום)',
    origin: result.origin.label ?? `${result.origin.lat},${result.origin.lon}`,
    farFromLine: !stations.length || stations[0].walkingMinutes > FAR_WALKING_MINUTES,
    stations,
  };
}

async function departures(timetable: LightRailTimetable, { from, to, date, time, limit }: z.infer<typeof schema>) {
  if (!from || !to) {
    return { error: 'Both from and to are required for departures' };
  }
  const origin = resolveStation(timetable.stations, from, 'from');
  if (origin.error) {
    return origin.error;
  }
  const destination = resolveStation(timetable.stations, to, 'to');
  if (destination.error) {
    return destination.error;
  }
  if (origin.station.id === destination.station.id) {
    return { error: 'Origin and destination are the same station' };
  }

  const nowLocal = toZonedTime(new Date(), DEFAULT_TIMEZONE);
  const searchDate = date ?? format(nowLocal, 'yyyy-MM-dd');
  const searchTime = time ?? format(nowLocal, 'HH:mm');

  const departures = findLightRailDepartures(timetable, { fromStationId: origin.station.id, toStationId: destination.station.id, date: searchDate, time: searchTime, limit });
  const { nameHe: fromHe, nameEn: fromEn } = origin.station;
  const { nameHe: toHe, nameEn: toEn } = destination.station;

  return {
    line: 'Red Line (הקו האדום)',
    dataSource: 'scheduled timetable (not live)',
    from: { nameHe: fromHe, nameEn: fromEn },
    to: { nameHe: toHe, nameEn: toEn },
    searchedFrom: `${searchDate} ${searchTime}`,
    departures: departures.map(({ terminus, ...departure }) => ({ ...departure, towards: { nameHe: terminus.nameHe, nameEn: terminus.nameEn } })),
    verifyUrl: buildGoogleMapsTransitUrl(origin.station, destination.station),
  };
}

async function runner(input: z.infer<typeof schema>) {
  const timetable = await getLightRailTimetable();
  return input.action === 'nearest_station' ? nearestStation(timetable, input) : departures(timetable, input);
}

export const lightRailTool = tool(runner, {
  name: 'light_rail',
  description: `Tel Aviv light rail Red Line (הרכבת הקלה / הקו האדום, Petah Tikva ↔ Tel Aviv ↔ Bat Yam, incl. the Kiryat Arye branch): upcoming departures between two of its stations from the official Ministry of Transport timetable (action "departures"), or the closest stations to a place (action "nearest_station").
Rules:
- Use this (not israel_rail) whenever the user mentions the light rail / רכבת קלה / הקו האדום / רק"ל, or both stations are Red Line stops that are not Israel Railways stations (e.g. Allenby, Carlebach, Elifelet, Bialik, HaKomemiyut).
- Pass station names exactly as the user wrote them (Hebrew or English); the tool resolves them. Convert relative times ("tomorrow at 8", "in an hour", "מחר בבוקר") to date + time in Israel time.
- If the result has "candidates", ask which station they meant (or re-call with the obvious one). If it has "allStations", pick the closest real station and re-call, or ask the user.
- The times are the SCHEDULED timetable, not live tracking — say so briefly (e.g. "לפי לוח הזמנים" / "scheduled").
- Reply format: one line per departure: departure → arrival, duration, and the direction (towards). Mention the date only if it is not today.
- If departures is empty, say there are no more scheduled trips for that time (the line does not run on Shabbat) and suggest a later time.
- ALWAYS end the reply with verifyUrl as a markdown link (e.g. [Open in Google Maps](url) / [פתיחה בגוגל מפות](url)).
- Use station names in the user's language (nameHe for Hebrew, nameEn for English).
nearest_station rules:
- Use it when the user asks for the closest / nearest light rail station to a place ("מה התחנה הקרובה לדיזנגוף סנטר?", "nearest light rail to Rothschild 22") or shares a location (pass lat/lon).
- Reply with the closest station first: name, walking minutes and distance (meters, or km above 1000), then the other options in one short line each. If walkingIsEstimate is true, say the walking time is approximate ("בערך" / "about").
- Add each station's walkingDirectionsUrl as a markdown link (e.g. [Walking directions](url) / [הוראות הליכה](url)).
- If farFromLine is true, say the place is not really near the Red Line.
- If the user also asked for trains from there (e.g. "and when is the next train to Allenby?"), call action "departures" from the nearest station afterwards.`,
  schema,
});
