import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { DEFAULT_TIMEZONE } from '@core/config';
import { type CalendarEvent } from '@shared/calendar-events';

export function formatEventTime({ start, end }: CalendarEvent): string {
  if (start.dateTime && end.dateTime) {
    const startZoned = toZonedTime(new Date(start.dateTime), DEFAULT_TIMEZONE);
    const endZoned = toZonedTime(new Date(end.dateTime), DEFAULT_TIMEZONE);
    const startTime = format(startZoned, 'HH:mm');
    const endTime = format(endZoned, 'HH:mm');
    return `${startTime}-${endTime}`;
  }
  return 'All day';
}
