import { DEFAULT_CALENDAR_ID } from '../constants';
import { provideCalendar } from '../provide-calendar';

export async function deleteEvent(eventId: string, calendarId = DEFAULT_CALENDAR_ID): Promise<void> {
  const calendar = provideCalendar();
  await calendar.events.delete({ calendarId, eventId });
}
