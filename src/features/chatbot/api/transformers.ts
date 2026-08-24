import { addDays, differenceInCalendarDays, parseISO } from 'date-fns';
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';
import { DEFAULT_TIMEZONE } from '@core/config';
import type { CalendarEvent } from '@services/google-calendar';
import type { UsageAggregateRow } from '@shared/ai';
import type { Reminder } from '@shared/reminders';
import type { DashboardResponse, EventDto, ReminderDto, UpcomingBirthdayDto, UsageResponse } from './dto';

export function dateKey(date: Date): string {
  return formatInTimeZone(date, DEFAULT_TIMEZONE, 'yyyy-MM-dd');
}

export function isBirthdayEvent(summary: string): boolean {
  return summary.toLowerCase().includes('birthday');
}

export function toEventDto(event: CalendarEvent, fallbackId: string): EventDto {
  const isAllDay = Boolean(event.start?.date && !event.start?.dateTime);
  const startValue = event.start?.dateTime ?? event.start?.date;
  const endValue = event.end?.dateTime ?? event.end?.date;
  return {
    id: event.id ?? fallbackId,
    summary: event.summary ?? '(no title)',
    start: startValue ?? '',
    end: endValue,
    isAllDay,
    isBirthday: isBirthdayEvent(event.summary ?? ''),
    location: event.location,
  };
}

export function toReminderDto(reminder: Pick<Reminder, '_id' | 'message' | 'dueDate' | 'status' | 'snoozedUntil'>): ReminderDto {
  return {
    id: reminder._id.toString(),
    message: reminder.message,
    dueDate: reminder.dueDate.toISOString(),
    status: reminder.status,
    snoozedUntil: reminder.snoozedUntil?.toISOString(),
  };
}

export function parseSelectedDate(raw: unknown, now = new Date()): Date {
  if (typeof raw === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return fromZonedTime(`${raw}T00:00:00`, DEFAULT_TIMEZONE);
  }
  return fromZonedTime(`${dateKey(now)}T00:00:00`, DEFAULT_TIMEZONE);
}

export function buildDashboardResponse(
  selectedDate: Date,
  now: Date,
  googleEvents: ReadonlyArray<CalendarEvent>,
  reminders: ReadonlyArray<Pick<Reminder, '_id' | 'message' | 'dueDate' | 'status' | 'snoozedUntil'>>,
): DashboardResponse {
  const eventDtos = googleEvents.map((event, index) => toEventDto(event, `event-${index}`));
  return {
    date: dateKey(selectedDate),
    isToday: dateKey(selectedDate) === dateKey(now),
    birthdays: eventDtos.filter((event) => event.isBirthday),
    events: eventDtos.filter((event) => !event.isBirthday),
    reminders: reminders.map(toReminderDto),
  };
}

export function buildUsageResponse(rows: ReadonlyArray<UsageAggregateRow>, days: number, from: Date): UsageResponse {
  const totals = rows.reduce((acc, row) => ({ cost: acc.cost + row.cost, turns: acc.turns + row.turns, tokensTotal: acc.tokensTotal + row.tokensTotal }), { cost: 0, turns: 0, tokensTotal: 0 });

  const dayMap = new Map<string, { cost: number; turns: number; tokensTotal: number }>();
  for (let i = 0; i < days; i++) {
    dayMap.set(dateKey(addDays(from, i + 1)), { cost: 0, turns: 0, tokensTotal: 0 });
  }
  for (const row of rows) {
    const entry = dayMap.get(row.day) ?? { cost: 0, turns: 0, tokensTotal: 0 };
    dayMap.set(row.day, { cost: entry.cost + row.cost, turns: entry.turns + row.turns, tokensTotal: entry.tokensTotal + row.tokensTotal });
  }

  const sourceMap = new Map<string, { cost: number; turns: number; tokensTotal: number }>();
  for (const row of rows) {
    const entry = sourceMap.get(row.source) ?? { cost: 0, turns: 0, tokensTotal: 0 };
    sourceMap.set(row.source, { cost: entry.cost + row.cost, turns: entry.turns + row.turns, tokensTotal: entry.tokensTotal + row.tokensTotal });
  }

  return {
    days,
    totals,
    perDay: [...dayMap.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([day, values]) => ({ day, ...values })),
    perSource: [...sourceMap.entries()].sort((a, b) => b[1].cost - a[1].cost).map(([source, values]) => ({ source, ...values })),
  };
}

export function toUpcomingBirthdays(events: ReadonlyArray<CalendarEvent>, now: Date): UpcomingBirthdayDto[] {
  const todayKey = dateKey(now);
  return events
    .filter((event) => event.start && isBirthdayEvent(event.summary ?? ''))
    .map((event) => {
      const date = event.start.date ?? dateKey(new Date(event.start.dateTime!));
      return {
        id: event.id ?? '',
        summary: event.summary ?? '(no title)',
        date,
        inDays: differenceInCalendarDays(parseISO(date), parseISO(todayKey)),
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date));
}
