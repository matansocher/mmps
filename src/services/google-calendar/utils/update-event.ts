import { CalendarEvent } from '../types';

export async function updateEvent(eventId: string, eventDetails: Partial<CalendarEvent>, calendarId = 'primary'): Promise<CalendarEvent> {
  const calendar = this.provideCalendar();
  const response = await calendar.events.patch({ calendarId, eventId, requestBody: eventDetails });
  return response.data as CalendarEvent;
}
