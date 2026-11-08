import { tool } from '@langchain/core/tools';
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { z } from 'zod';
import { ISRAEL_TIMEZONE } from '@core/config';
import { getErrorMessage, Logger } from '@core/utils';
import { findStations, RAIL_STATIONS, searchTrains } from '@services/israel-rail';
import type { RailStation } from '@services/israel-rail';
import { findLightRailStations, getLightRailTimetable } from '@services/light-rail';
import type { LightRailStation, LightRailTimetable } from '@services/light-rail';
import { findRailTripInterchanges, planRailTrip, TRANSFER_BUFFER_MINUTES } from '@shared/rail-trip';
import type { RailTripEndpoint, RailTripInterchange } from '@shared/rail-trip';

const logger = new Logger('RailTripTool');

const MAX_CANDIDATES = 10;

const schema = z.object({
  from: z.string().describe('Origin: a Red Line light rail stop or an Israel Railways station, as the user said it, in Hebrew or English (e.g. "אלנבי", "Carlebach", "חיפה חוף הכרמל")'),
  to: z.string().describe('Destination: a Red Line light rail stop or an Israel Railways station, as the user said it, in Hebrew or English (e.g. "Haifa Hof HaCarmel", "בלומפילד", "Elifelet")'),
  date: z.string().optional().describe('Travel date in YYYY-MM-DD format, Israel time. Omit for today'),
  time: z.string().optional().describe('Earliest departure time in HH:mm (24h) format, Israel time. Omit for now'),
  limit: z.number().int().min(1).max(5).optional().describe('How many trip options to return (default 3)'),
});

type Matches = { readonly query: string; readonly lightRail: LightRailStation[]; readonly rail: RailStation[] };

let cachedInterchanges: { readonly builtAt: number; readonly interchanges: RailTripInterchange[] } | undefined;

function getInterchanges(timetable: LightRailTimetable): RailTripInterchange[] {
  if (cachedInterchanges?.builtAt !== timetable.builtAt) {
    cachedInterchanges = { builtAt: timetable.builtAt, interchanges: findRailTripInterchanges(RAIL_STATIONS, timetable.stations) };
  }
  return cachedInterchanges.interchanges;
}

function findMatches(timetable: LightRailTimetable, query: string): Matches {
  return { query, lightRail: findLightRailStations(timetable.stations, query), rail: findStations(query) };
}

function resolveEndpoints(from: Matches, to: Matches): { readonly origin?: RailTripEndpoint; readonly destination?: RailTripEndpoint } {
  if (from.lightRail.length === 1 && to.rail.length === 1) {
    return { origin: { kind: 'light_rail', station: from.lightRail[0] }, destination: { kind: 'rail', station: to.rail[0] } };
  }
  if (from.rail.length === 1 && to.lightRail.length === 1) {
    return { origin: { kind: 'rail', station: from.rail[0] }, destination: { kind: 'light_rail', station: to.lightRail[0] } };
  }
  return {};
}

function describeMatches({ query, lightRail, rail }: Matches) {
  const names = (stations: readonly { readonly nameEn: string; readonly nameHe: string }[]) => stations.slice(0, MAX_CANDIDATES).map(({ nameEn, nameHe }) => ({ nameEn, nameHe }));
  return { query, redLineMatches: names(lightRail), trainStationMatches: names(rail) };
}

function buildResolutionError(from: Matches, to: Matches) {
  const onlyLightRail = (matches: Matches) => matches.lightRail.length > 0 && !matches.rail.length;
  const onlyRail = (matches: Matches) => matches.rail.length > 0 && !matches.lightRail.length;
  if (onlyLightRail(from) && onlyLightRail(to)) {
    return { error: 'Both stations are on the Red Line only, use the light_rail tool instead' };
  }
  if (onlyRail(from) && onlyRail(to)) {
    return { error: 'Both stations are Israel Railways stations, use the israel_rail tool instead' };
  }
  return {
    error: 'Could not resolve a Red Line stop on one side and an Israel Railways station on the other. Ask the user which station they meant, or re-call with the exact candidate name',
    from: describeMatches(from),
    to: describeMatches(to),
  };
}

async function runner({ from, to, date, time, limit }: z.infer<typeof schema>) {
  const timetable = await getLightRailTimetable();
  const fromMatches = findMatches(timetable, from);
  const toMatches = findMatches(timetable, to);
  const { origin, destination } = resolveEndpoints(fromMatches, toMatches);
  if (!origin || !destination) {
    return buildResolutionError(fromMatches, toMatches);
  }

  const nowLocal = toZonedTime(new Date(), ISRAEL_TIMEZONE);
  const searchDate = date ?? format(nowLocal, 'yyyy-MM-dd');
  const searchTime = time ?? format(nowLocal, 'HH:mm');

  const interchanges = getInterchanges(timetable);
  const result = await planRailTrip({ timetable, interchanges, searchTrains }, { origin, destination, date: searchDate, time: searchTime, limit });
  if (!result.plans.length && result.trainSearchFailed) {
    logger.warn(`Train search failed while planning ${origin.station.nameEn} -> ${destination.station.nameEn}`);
  }

  return {
    dataSource: 'Israel Railways live schedule + scheduled Red Line timetable (not live)',
    from: { nameEn: origin.station.nameEn, nameHe: origin.station.nameHe, type: origin.kind },
    to: { nameEn: destination.station.nameEn, nameHe: destination.station.nameHe, type: destination.kind },
    searchedFrom: `${searchDate} ${searchTime}`,
    transferBufferMinutes: TRANSFER_BUFFER_MINUTES,
    interchanges: interchanges.map(({ lightRailStation, railStation, walkingMinutes }) => ({ redLine: lightRailStation.nameEn, train: railStation.nameEn, walkingMinutes })),
    plans: result.plans,
    ...(result.messages.length ? { alerts: result.messages } : {}),
    ...(!result.plans.length ? { note: result.trainSearchFailed ? 'Israel Railways search is unavailable right now' : 'No connection found for this time (the Red Line does not run on Shabbat and trains are limited at night)' } : {}),
  };
}

async function safeRunner(input: z.infer<typeof schema>) {
  try {
    return await runner(input);
  } catch (err) {
    logger.error(`Trip planning failed: ${getErrorMessage(err)}`);
    return { error: 'Trip planning is unavailable right now' };
  }
}

export const railTripTool = tool(safeRunner, {
  name: 'rail_trip',
  description: `Plan one trip that combines the Tel Aviv light rail Red Line (הקו האדום) and Israel Railways, with the walk between them at an interchange (Arlozorov ↔ Tel Aviv Savidor, Sha'ul HaMelekh ↔ Tel Aviv HaShalom, Kiryat Arye ↔ Petah Tikva Kiryat Arye). Works both ways: Red Line → walk → train, or train → walk → Red Line. Picks the options that arrive earliest.
Rules:
- Use this when one end is a Red Line stop that is not a train station (e.g. Allenby, Carlebach, Elifelet, Bialik, HaKomemiyut, Bloomfield, Petah Tikva Central Station) and the other end is an Israel Railways station outside the Red Line area (e.g. Haifa, Netanya, Jerusalem, Beer Sheva, Ben Gurion Airport). For two Red Line stops use light_rail; for two train stations use israel_rail.
- If the user gave a place instead of a stop (an address, mall, landmark), first find the nearest Red Line stop with light_rail nearest_station (or the nearest train station with israel_rail nearest_station), then call this tool with the station name.
- Pass station names exactly as the user wrote them; the tool resolves them. Convert relative times ("tomorrow at 8", "בעוד שעה") to date + time in Israel time.
- If the result has redLineMatches / trainStationMatches candidates, ask which station they meant, or re-call with the obvious candidate. If it says to use light_rail or israel_rail, call that tool instead.
- Reply with the best plan first as a short step-by-step list, one line per leg: Red Line legs (departure → arrival, from → to, towards), the walk (minutes and meters, e.g. "walk ~5 min (380 m) from Arlozorov to Savidor"), and train legs (departure → arrival, platform, train number, and every transfer from transferDetails with its wait). Then the total: leave at departureTime, arrive at arrivalTime, durationMinutes. Then list the other plans in one short line each (departure → arrival, via which interchange).
- The walk already includes transferBufferMinutes extra to reach the platform; there is no need to mention it unless asked.
- The Red Line times are the SCHEDULED timetable, not live — say so briefly. Mention the date only if it is not today.
- If plans is empty, explain the note and suggest a later time.
- Add alerts briefly at the end if present.
- ALWAYS end the reply with the verifyUrl of the best plan's train leg as a markdown link ([Verify on rail.co.il](url) / [לבדיקה באתר הרכבת](url)).
- Use station names in the user's language (nameHe for Hebrew, nameEn for English).`,
  schema,
});
