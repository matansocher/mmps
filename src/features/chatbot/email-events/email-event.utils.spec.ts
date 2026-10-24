import { buildCalendarEvent } from './email-event.utils';
import type { EmailEventDetails } from './types';

const base: EmailEventDetails = { title: 'Dentist', date: '2026-05-12', startTime: '18:00', endDate: null, endTime: null, location: null, description: null };

describe('buildCalendarEvent()', () => {
  test.each([
    { name: 'default 1h duration', event: base, start: '2026-05-12T18:00:00', end: '2026-05-12T19:00:00' },
    { name: 'explicit end time', event: { ...base, endTime: '20:30' }, start: '2026-05-12T18:00:00', end: '2026-05-12T20:30:00' },
    { name: 'end before start falls back to 1h', event: { ...base, endTime: '17:00' }, start: '2026-05-12T18:00:00', end: '2026-05-12T19:00:00' },
    { name: 'end on the next day', event: { ...base, startTime: '23:30', endDate: '2026-05-13', endTime: '01:00' }, start: '2026-05-12T23:30:00', end: '2026-05-13T01:00:00' },
  ])('should build a timed event with $name', ({ event, start, end }) => {
    const result = buildCalendarEvent(event);
    expect(result.start).toEqual({ dateTime: start, timeZone: 'Asia/Jerusalem' });
    expect(result.end).toEqual({ dateTime: end, timeZone: 'Asia/Jerusalem' });
  });

  test.each([
    { event: { ...base, startTime: null }, end: '2026-05-13' },
    { event: { ...base, startTime: null, endDate: '2026-05-14' }, end: '2026-05-15' },
  ])('should build an all-day event ending on $end (exclusive)', ({ event, end }) => {
    expect(buildCalendarEvent(event)).toEqual({ summary: 'Dentist', start: { date: '2026-05-12' }, end: { date: end } });
  });
});
