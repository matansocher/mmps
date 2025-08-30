import { DEFAULT_CALENDAR_ID } from '../constants';
import { provideCalendar } from '../provide-calendar';
import { CalendarEvent } from '../types';

export async function getEvent(eventId: string, calendarId = DEFAULT_CALENDAR_ID): Promise<CalendarEvent> {
  const calendar = provideCalendar();
  const response = await calendar.events.get({ calendarId, eventId });
  return response.data as CalendarEvent;
}
