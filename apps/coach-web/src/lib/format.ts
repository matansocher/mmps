function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function formatMatchDate(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);
  if (sameDay(d, today)) return 'היום';
  if (sameDay(d, tomorrow)) return 'מחר';
  return d.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit' });
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

export function dateStringFromOffset(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function formatDateHeader(dateStr: string): string {
  const today = dateStringFromOffset(0);
  const tomorrow = dateStringFromOffset(1);
  const yesterday = dateStringFromOffset(-1);
  const [, m, d] = dateStr.split('-');
  const ddmm = `${d}.${m}`;
  if (dateStr === today) return `היום · ${ddmm}`;
  if (dateStr === tomorrow) return `מחר · ${ddmm}`;
  if (dateStr === yesterday) return `אתמול · ${ddmm}`;
  const dow = new Date(dateStr + 'T12:00:00').toLocaleDateString('he-IL', { weekday: 'long' });
  return `${dow} · ${ddmm}`;
}
