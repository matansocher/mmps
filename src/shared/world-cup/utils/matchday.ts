import { formatInTimeZone, toZonedTime } from 'date-fns-tz';
import { subDays, addDays, startOfDay, setHours } from 'date-fns';
import { DEFAULT_TIMEZONE } from '@core/config';

/**
 * Returns YYYY-MM-DD identifying the noon-to-noon window the date belongs to.
 * A match at 03:00 Asia/Jerusalem on Wednesday belongs to Tuesday's matchday.
 */
export function getMatchdayKey(date: Date): string {
  const zoned = toZonedTime(date, DEFAULT_TIMEZONE);
  if (zoned.getHours() < 12) {
    return formatInTimeZone(subDays(date, 1), DEFAULT_TIMEZONE, 'yyyy-MM-dd');
  }
  return formatInTimeZone(date, DEFAULT_TIMEZONE, 'yyyy-MM-dd');
}

/**
 * Given a matchday key (YYYY-MM-DD), returns the UTC date range
 * representing the noon-to-noon window.
 */
export function getMatchdayWindow(matchdayKey: string): { from: Date; to: Date } {
  const [year, month, day] = matchdayKey.split('-').map(Number);
  const baseDate = new Date(year, month - 1, day);
  const zonedNoon = toZonedTime(baseDate, DEFAULT_TIMEZONE);
  const noonStart = setHours(startOfDay(zonedNoon), 12);

  // Convert from zoned back to UTC by formatting
  const fromStr = formatInTimeZone(noonStart, DEFAULT_TIMEZONE, "yyyy-MM-dd'T'HH:mm:ssXXX");
  const toDate = addDays(noonStart, 1);
  const toStr = formatInTimeZone(toDate, DEFAULT_TIMEZONE, "yyyy-MM-dd'T'HH:mm:ssXXX");

  return { from: new Date(fromStr), to: new Date(toStr) };
}
