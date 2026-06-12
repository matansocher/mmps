import { addDays, addMonths, format, parseISO } from 'date-fns';

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

export type ReminderDueLabel = { readonly label: string; readonly isOverdue: boolean };

export function formatReminderDueDate(dueIso: string, selectedYmd: string): ReminderDueLabel {
  try {
    const due = parseISO(dueIso);
    const dueDay = format(due, 'yyyy-MM-dd');
    const hhmm = format(due, 'HH:mm');
    if (dueDay === selectedYmd) {
      return { label: `🔔 ${hhmm}`, isOverdue: false };
    }
    const overdue = dueDay < selectedYmd;
    const dayLabel = isYesterday(dueDay)
      ? 'Yesterday'
      : isTomorrow(dueDay)
        ? 'Tomorrow'
        : format(due, 'EEE d MMM');
    const icon = overdue ? '⏰' : '🔔';
    return { label: `${icon} ${dayLabel} · ${hhmm}`, isOverdue: overdue };
  } catch {
    return { label: '', isOverdue: false };
  }
}

export function currentYm(): string {
  return format(new Date(), 'yyyy-MM');
}

export function shiftMonth(ym: string, delta: number): string {
  const base = parseISO(`${ym}-01T00:00:00`);
  return format(addMonths(base, delta), 'yyyy-MM');
}

export function formatMonthLabel(ym: string): string {
  return format(parseISO(`${ym}-01T00:00:00`), 'MMM yyyy');
}

export function formatExpenseDayLabel(iso: string): string {
  try {
    const d = parseISO(iso);
    const dayYmd = format(d, 'yyyy-MM-dd');
    if (isToday(dayYmd)) return 'Today';
    if (isYesterday(dayYmd)) return 'Yesterday';
    return format(d, 'MMM d');
  } catch {
    return '';
  }
}
