import { CalendarEvent } from '../types';

export function formatEvent(event: CalendarEvent) {
  const start = event.start?.dateTime || event.start?.date;
  const end = event.end?.dateTime || event.end?.date;

  let dateStr = '';
  if (start) {
    const startDate = new Date(start);
    dateStr = startDate.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: event.start?.dateTime ? 'numeric' : undefined,
      minute: event.start?.dateTime ? '2-digit' : undefined,
      hour12: true,
    });
  }

  if (end && event.end?.dateTime) {
    const endDate = new Date(end);
    dateStr += ` - ${endDate.toLocaleString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`;
  }

  return {
    id: event.id,
    title: event.summary || 'Untitled Event',
    date: dateStr,
    location: event.location,
    description: event.description,
    status: event.status,
  };
}
