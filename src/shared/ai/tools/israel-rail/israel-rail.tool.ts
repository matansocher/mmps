import { tool } from '@langchain/core/tools';
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { z } from 'zod';
import { DEFAULT_TIMEZONE } from '@core/config';
import { findStations, RAIL_STATIONS, searchTrains } from '@services/israel-rail';
import type { RailStation } from '@services/israel-rail';

const schema = z.object({
  from: z.string().describe('Origin station name as the user said it, in Hebrew or English (e.g. "סבידור", "Tel Aviv HaHagana", "נתב״ג")'),
  to: z.string().describe('Destination station name as the user said it, in Hebrew or English (e.g. "חיפה חוף הכרמל", "Jerusalem Navon")'),
  date: z.string().optional().describe('Travel date in YYYY-MM-DD format, Israel time. Omit for today'),
  time: z.string().optional().describe('Earliest departure time in HH:mm (24h) format, Israel time. Omit for now'),
  limit: z.number().int().min(1).max(10).optional().describe('How many upcoming trains to return (default 5)'),
});

type StationResolution = { readonly station?: RailStation; readonly error?: Record<string, unknown> };

function resolveStation(query: string, role: 'from' | 'to'): StationResolution {
  const matches = findStations(query);
  if (matches.length === 1) {
    return { station: matches[0] };
  }
  if (matches.length > 1) {
    return { error: { error: `Ambiguous ${role} station "${query}"`, candidates: matches.map(({ nameEn, nameHe }) => ({ nameEn, nameHe })) } };
  }
  return { error: { error: `Unknown ${role} station "${query}"`, allStations: RAIL_STATIONS.map(({ nameEn, nameHe }) => `${nameEn} / ${nameHe}`) } };
}

async function runner({ from, to, date, time, limit }: z.infer<typeof schema>) {
  const origin = resolveStation(from, 'from');
  if (origin.error) {
    return origin.error;
  }
  const destination = resolveStation(to, 'to');
  if (destination.error) {
    return destination.error;
  }

  const nowLocal = toZonedTime(new Date(), DEFAULT_TIMEZONE);
  const searchDate = date ?? format(nowLocal, 'yyyy-MM-dd');
  const searchTime = time ?? format(nowLocal, 'HH:mm');

  const { travels, messages } = await searchTrains({ fromStationId: origin.station.id, toStationId: destination.station.id, date: searchDate, hour: searchTime, limit });

  return {
    from: origin.station,
    to: destination.station,
    searchedFrom: `${searchDate} ${searchTime}`,
    trains: travels,
    alerts: messages,
  };
}

export const israelRailTool = tool(runner, {
  name: 'israel_rail',
  description: `Get live upcoming Israel Railways trains between two stations (real-time data from rail.co.il), including departure/arrival times, platforms, delays, transfers and predicted crowding.
Rules:
- Pass station names exactly as the user wrote them (Hebrew or English); the tool resolves them. Convert relative times ("tomorrow at 8", "in an hour", "מחר בבוקר") to date + time in Israel time.
- If the result has "candidates" (ambiguous name), ask the user which station they meant, or re-call with the obvious candidate if context makes it clear. If it has "allStations", pick the closest real station and re-call, or ask the user.
- Reply format: one line per train: departure → arrival, duration, platform, train number; mention delays (delayMinutes > 0) and crowding only if high (>70%).
- For every train with transfers, ALWAYS include each transfer from transferDetails, without being asked: the transfer station, arrival platform → departure platform, the connecting train number and its departure time, and the wait time.
- Add any alerts briefly at the end.
- Use station names in the user's language (nameHe for Hebrew, nameEn for English).`,
  schema,
});
