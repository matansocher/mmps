import { format } from 'date-fns';
import { FULL_DATE_CATEGORY_ID, PS5_PLATFORM_ID, TBA_STATUS_ID, WORLDWIDE_REGION_ID } from '../constants';
import type { GameReleaseInfo, IgdbReleaseDateResponse } from '../types';

const TBA_RELEASE: GameReleaseInfo = { date: null, human: 'TBA', status: 'tba' };

// A release_dates entry has a real, comparable day only when its `category` is the full-date format.
// Fuzzy windows (month / year / quarter) still carry a `date` timestamp pointing at the start of the
// period, which would wrongly read as "released" once that start day passes.
function hasExactDay(entry: IgdbReleaseDateResponse): boolean {
  return typeof entry.date === 'number' && (entry.category === undefined || entry.category === FULL_DATE_CATEGORY_ID);
}

// IGDB returns one release_dates entry per platform+region. Collapse them into the single
// PS5 date we care about, preferring the worldwide entry over the earliest regional one.
export function resolveReleaseInfo(releaseDates: readonly IgdbReleaseDateResponse[] | undefined, now: Date = new Date()): GameReleaseInfo {
  const ps5Dates = (releaseDates ?? []).filter((entry) => entry.platform === undefined || entry.platform === PS5_PLATFORM_ID);
  if (!ps5Dates.length) {
    return TBA_RELEASE;
  }

  const dated = ps5Dates.filter(hasExactDay).sort((a, b) => a.date - b.date);
  if (dated.length) {
    const entry = dated.find((candidate) => candidate.region === WORLDWIDE_REGION_ID) ?? dated[0];
    const date = new Date(entry.date * 1000);
    return {
      date,
      human: format(date, 'MMM d, yyyy'),
      status: date.getTime() <= now.getTime() ? 'released' : 'upcoming',
    };
  }

  // No exact day yet — IGDB still exposes a fuzzy year/quarter through `human` and `y`.
  const fuzzy = ps5Dates.find((entry) => entry.status !== TBA_STATUS_ID && (entry.human || entry.y));
  if (fuzzy) {
    return { date: null, human: fuzzy.human || String(fuzzy.y), status: 'upcoming' };
  }

  return TBA_RELEASE;
}
