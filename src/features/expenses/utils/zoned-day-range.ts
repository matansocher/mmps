import { endOfDay, startOfDay } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { DEFAULT_TIMEZONE } from '@core/config';

export function zonedDayRange(date: Date): { from: Date; to: Date } {
  const zoned = toZonedTime(date, DEFAULT_TIMEZONE);
  return { from: startOfDay(zoned), to: endOfDay(zoned) };
}
