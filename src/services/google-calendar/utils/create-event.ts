import { provideCalendar } from '../provide-calendar';
import { CalendarEvent } from '../types';

export async function createEvent(eventDetails: CalendarEvent, calendarId = 'primary'): Promise<CalendarEvent> {
  const calendar = provideCalendar();
  const response = await calendar.events.insert({ calendarId, requestBody: eventDetails });
  return response.data as CalendarEvent;
}
