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
