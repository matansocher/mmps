import { provideCalendar } from '../provide-calendar';

export async function deleteEvent(eventId: string, calendarId = 'primary'): Promise<void> {
  const calendar = provideCalendar();
  await calendar.events.delete({ calendarId, eventId });
}
