import { addDays, format, parseISO } from 'date-fns';

export function ymd(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

export function todayYmd(): string {
  return ymd(new Date());
}

export function dateFromYmd(value: string): Date {
  return parseISO(`${value}T00:00:00`);
}

export function shiftDays(value: string, delta: number): string {
  return ymd(addDays(dateFromYmd(value), delta));
}

export function isToday(value: string): boolean {
  return value === todayYmd();
}

export function isTomorrow(value: string): boolean {
  return value === ymd(addDays(new Date(), 1));
}

export function isYesterday(value: string): boolean {
  return value === ymd(addDays(new Date(), -1));
}

export function formatTime(iso: string): string {
  try {
    return format(parseISO(iso), 'HH:mm');
  } catch {
    return '';
  }
}

export function formatDateTimeLocal(date: Date): string {
  return format(date, "yyyy-MM-dd'T'HH:mm");
}

export function formatLongDate(value: string): string {
  return dateFromYmd(value).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
}
