import { addDays, addMinutes, format, parse } from 'date-fns';
import { DEFAULT_TIMEZONE } from '@core/config';
import type { CalendarEvent } from '@services/google-calendar';
import type { EmailEventDetails } from './types';

const DEFAULT_DURATION_MINUTES = 60;
const LOCAL_DATE_TIME_FORMAT = "yyyy-MM-dd'T'HH:mm:ss";

const parseLocal = (date: string, time: string): Date => parse(`${date} ${time}`, 'yyyy-MM-dd HH:mm', new Date());

export function buildCalendarEvent(event: EmailEventDetails): CalendarEvent {
  const base = { summary: event.title, ...(event.location ? { location: event.location } : {}), ...(event.description ? { description: event.description } : {}) };

  if (!event.startTime) {
    const lastDay = event.endDate && event.endDate > event.date ? event.endDate : event.date;
    const exclusiveEnd = format(addDays(parse(lastDay, 'yyyy-MM-dd', new Date()), 1), 'yyyy-MM-dd');
    return { ...base, start: { date: event.date }, end: { date: exclusiveEnd } };
  }

  const start = parseLocal(event.date, event.startTime);
  const explicitEnd = event.endTime ? parseLocal(event.endDate ?? event.date, event.endTime) : null;
  const end = explicitEnd && explicitEnd > start ? explicitEnd : addMinutes(start, DEFAULT_DURATION_MINUTES);
  return {
    ...base,
    start: { dateTime: format(start, LOCAL_DATE_TIME_FORMAT), timeZone: DEFAULT_TIMEZONE },
    end: { dateTime: format(end, LOCAL_DATE_TIME_FORMAT), timeZone: DEFAULT_TIMEZONE },
  };
}

export function formatEventWhen(event: EmailEventDetails): string {
  const day = format(parse(event.date, 'yyyy-MM-dd', new Date()), 'EEE, d MMM yyyy');
  const endDay = event.endDate && event.endDate !== event.date ? format(parse(event.endDate, 'yyyy-MM-dd', new Date()), 'EEE, d MMM yyyy') : null;
  if (!event.startTime) {
    return endDay ? `${day} – ${endDay} (all day)` : `${day} (all day)`;
  }
  const time = event.endTime ? `${event.startTime}–${event.endTime}` : event.startTime;
  return endDay ? `${day} ${event.startTime} – ${endDay} ${event.endTime ?? ''}`.trim() : `${day} · ${time}`;
}

export function buildEventSuggestionText(event: EmailEventDetails, from: string, subject: string): string {
  return [
    '📅 Found an event in your email — add it to your calendar?',
    '',
    `📌 ${event.title}`,
    `🗓 ${formatEventWhen(event)}`,
    ...(event.location ? [`📍 ${event.location}`] : []),
    `✉️ ${from} — ${subject}`,
  ].join('\n');
}
