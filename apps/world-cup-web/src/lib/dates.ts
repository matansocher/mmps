function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

export function toDateString(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

export function dateStringFromOffset(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return toDateString(d);
}

export function todayString(): string {
  return dateStringFromOffset(0);
}

export function formatDateLabel(date: string): string {
  const d = new Date(date + 'T00:00:00');
  return d.toLocaleDateString('he-IL', { weekday: 'short', day: '2-digit', month: '2-digit' });
}

export function isSameDay(dateStr: string, matchStartTime: string): boolean {
  const matchDate = new Date(matchStartTime);
  const target = new Date(dateStr + 'T00:00:00');
  return matchDate.getFullYear() === target.getFullYear() && matchDate.getMonth() === target.getMonth() && matchDate.getDate() === target.getDate();
}
