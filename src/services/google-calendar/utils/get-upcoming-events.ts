import { CalendarEvent, CalendarListOptions } from '../types';
import { listEvents } from './list-events';

export async function getUpcomingEvents(days = 7, calendarId = 'primary'): Promise<CalendarEvent[]> {
  const now = new Date();
  const future = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  const options: CalendarListOptions = {
    timeMin: now.toISOString(),
    timeMax: future.toISOString(),
    singleEvents: true,
    orderBy: 'startTime',
  };
  return listEvents(options, calendarId);
}
