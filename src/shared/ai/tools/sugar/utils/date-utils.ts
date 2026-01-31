import { subDays, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';

export type DateRangeType = 'today' | 'week' | 'month' | 'all';

export function getDateRange(range: DateRangeType): { start: Date; end: Date } {
  const now = new Date();
  switch (range) {
    case 'today':
      return { start: startOfDay(now), end: endOfDay(now) };
    case 'week':
      return { start: startOfWeek(now), end: endOfWeek(now) };
    case 'month':
      return { start: startOfMonth(now), end: endOfMonth(now) };
    case 'all':
      return { start: subDays(now, 365), end: now };
  }
}
