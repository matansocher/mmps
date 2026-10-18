import { addDays, differenceInCalendarDays, format, parseISO } from 'date-fns';

// Calendar arithmetic on "YYYY-MM-DD" strings, independent of the server timezone.
export function shiftDate(date: string, days: number): string {
  return format(addDays(parseISO(date), days), 'yyyy-MM-dd');
}

export function daysBetween(from: string, to: string): number {
  return differenceInCalendarDays(parseISO(to), parseISO(from));
}
