import { differenceInCalendarDays } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { DEFAULT_TIMEZONE } from '@core/config';

// Calendar-day diff in the user's timezone — a plain millisecond division is off by one for most of the day.
export function getDaysUntilRelease(releaseDate: Date, now: Date = new Date()): number {
  return differenceInCalendarDays(toZonedTime(releaseDate, DEFAULT_TIMEZONE), toZonedTime(now, DEFAULT_TIMEZONE));
}

export function formatDaysUntilRelease(days: number): string {
  if (days === 0) {
    return 'releases today';
  }
  if (days === 1) {
    return 'releases tomorrow';
  }
  if (days < 0) {
    const daysAgo = Math.abs(days);
    return `released ${daysAgo} ${daysAgo === 1 ? 'day' : 'days'} ago`;
  }
  return `in ${days} days`;
}
