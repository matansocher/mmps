import { ObjectId } from 'mongodb';
import type { CalendarEvent } from '@services/google-calendar';
import type { UsageAggregateRow } from '@shared/ai';
import { buildDashboardResponse, buildUsageResponse, parseSelectedDate, toUpcomingBirthdays } from './transformers';

const event = (overrides: Partial<CalendarEvent> = {}): CalendarEvent => ({
  summary: 'Team sync',
  start: { dateTime: '2026-08-11T07:00:00.000Z' },
  end: { dateTime: '2026-08-11T08:00:00.000Z' },
  ...overrides,
});

describe('buildDashboardResponse()', () => {
  it('separates birthdays, applies fallback ids, and maps reminders', () => {
    const selectedDate = new Date('2026-08-10T21:00:00.000Z');
    const reminderId = new ObjectId();

    const result = buildDashboardResponse(
      selectedDate,
      new Date('2026-08-11T12:00:00.000Z'),
      [event(), event({ id: 'birthday-1', summary: 'Dana Birthday', start: { date: '2026-08-11' }, end: { date: '2026-08-12' } })],
      [{ _id: reminderId, message: 'Call Dana', dueDate: new Date('2026-08-11T09:00:00.000Z'), status: 'pending' }],
    );

    expect(result).toEqual({
      date: '2026-08-11',
      isToday: true,
      birthdays: [{ id: 'birthday-1', summary: 'Dana Birthday', start: '2026-08-11', end: '2026-08-12', isAllDay: true, isBirthday: true, location: undefined }],
      events: [{ id: 'event-0', summary: 'Team sync', start: '2026-08-11T07:00:00.000Z', end: '2026-08-11T08:00:00.000Z', isAllDay: false, isBirthday: false, location: undefined }],
      reminders: [{ id: reminderId.toString(), message: 'Call Dana', dueDate: '2026-08-11T09:00:00.000Z', status: 'pending', snoozedUntil: undefined }],
    });
  });
});

describe('buildUsageResponse()', () => {
  it('fills missing days, aggregates sources, and retains rows outside the requested day map', () => {
    const rows: UsageAggregateRow[] = [
      { source: 'chatbot', chatId: 1, day: '2026-08-10', cost: 1.2, turns: 2, tokensTotal: 100 },
      { source: 'chatbot', chatId: 2, day: '2026-08-10', cost: 0.3, turns: 1, tokensTotal: 50 },
      { source: 'expenses', chatId: null, day: '2026-08-08', cost: 2, turns: 4, tokensTotal: 200 },
    ];

    expect(buildUsageResponse(rows, 2, new Date('2026-08-08T21:00:00.000Z'))).toEqual({
      days: 2,
      totals: { cost: 3.5, turns: 7, tokensTotal: 350 },
      perDay: [
        { day: '2026-08-08', cost: 2, turns: 4, tokensTotal: 200 },
        { day: '2026-08-10', cost: 1.5, turns: 3, tokensTotal: 150 },
        { day: '2026-08-11', cost: 0, turns: 0, tokensTotal: 0 },
      ],
      perSource: [
        { source: 'expenses', cost: 2, turns: 4, tokensTotal: 200 },
        { source: 'chatbot', cost: 1.5, turns: 3, tokensTotal: 150 },
      ],
    });
  });
});

describe('date transformations', () => {
  it('defaults invalid selected dates to the current Jerusalem day', () => {
    expect(parseSelectedDate('invalid', new Date('2026-08-11T22:30:00.000Z')).toISOString()).toEqual('2026-08-11T21:00:00.000Z');
  });

  it('maps and sorts all-day and timed upcoming birthdays', () => {
    const birthdays = toUpcomingBirthdays(
      [
        event({ id: 'later', summary: 'Later birthday', start: { dateTime: '2026-08-13T07:00:00.000Z' } }),
        event({ id: 'tomorrow', summary: 'Tomorrow Birthday', start: { date: '2026-08-12' } }),
        event({ id: 'meeting', summary: 'Planning' }),
      ],
      new Date('2026-08-11T12:00:00.000Z'),
    );

    expect(birthdays).toEqual([
      { id: 'tomorrow', summary: 'Tomorrow Birthday', date: '2026-08-12', inDays: 1 },
      { id: 'later', summary: 'Later birthday', date: '2026-08-13', inDays: 2 },
    ]);
  });
});
