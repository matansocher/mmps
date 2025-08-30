import { DEFAULT_CALENDAR_ID } from '../constants';
import { provideCalendar } from '../provide-calendar';
import { CalendarEvent, CalendarListOptions } from '../types';

export async function listEvents(options?: CalendarListOptions, calendarId = DEFAULT_CALENDAR_ID): Promise<CalendarEvent[]> {
  const calendar = provideCalendar();
  const params: any = { calendarId, singleEvents: options?.singleEvents !== false, orderBy: options?.orderBy || 'startTime' };

  params.timeMin = options.timeMin ?? new Date().toISOString();

  if (options?.timeMax) {
    params.timeMax = options.timeMax;
  }

  if (options?.maxResults) {
    params.maxResults = options.maxResults;
  }

  if (options?.q) {
    params.q = options.q;
  }

  const response = await calendar.events.list(params);
  return response.data.items as CalendarEvent[];
}
