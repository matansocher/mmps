import { getErrorMessage, Logger } from '@core/utils';
import { lightRailTimetableCache } from './cache';
import { GTFS_URL, TIMETABLE_REFRESH_MS } from './constants';
import { withGtfsFeed } from './gtfs-download';
import { buildTimetable } from './gtfs-parser';
import type { LightRailTimetable } from './types';

const logger = new Logger('LightRailTimetable');
const CACHE_KEY = 'red-line';

let current: LightRailTimetable | null = null;
let inflight: Promise<LightRailTimetable> | null = null;

function isFresh(timetable: LightRailTimetable | null): boolean {
  return !!timetable && Date.now() - timetable.builtAt < TIMETABLE_REFRESH_MS;
}

async function loadTimetable(): Promise<LightRailTimetable> {
  const cached = await lightRailTimetableCache.get(CACHE_KEY);
  if (isFresh(cached)) return cached;

  const startedAt = Date.now();
  const timetable = await withGtfsFeed(GTFS_URL, (readLines) => buildTimetable(readLines));
  logger.log(`Built light rail timetable: ${timetable.stations.length} stations, ${timetable.trips.length} trips in ${Math.round((Date.now() - startedAt) / 1000)}s`);
  await lightRailTimetableCache.save(CACHE_KEY, timetable);
  return timetable;
}

function refresh(): Promise<LightRailTimetable> {
  inflight ??= (async () => {
    try {
      current = await loadTimetable();
      return current;
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

// Serves the in-memory copy and refreshes it in the background once it is older than a day.
export async function getLightRailTimetable(): Promise<LightRailTimetable> {
  if (isFresh(current)) return current;
  if (current) {
    refresh().catch((err) => logger.error(`Background timetable refresh failed: ${getErrorMessage(err)}`));
    return current;
  }
  return refresh();
}

export function warmLightRailTimetable(): void {
  getLightRailTimetable().catch((err) => logger.error(`Failed to warm light rail timetable: ${getErrorMessage(err)}`));
}
