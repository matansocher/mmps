import { provideCalendar } from '../provide-calendar';
import { CalendarEvent } from '../types';

export async function getEvent(eventId: string, calendarId = 'primary'): Promise<CalendarEvent> {
  const calendar = provideCalendar();
  const response = await calendar.events.get({ calendarId, eventId });
  return response.data as CalendarEvent;
}
