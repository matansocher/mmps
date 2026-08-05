const ILS_FORMATTER = new Intl.NumberFormat('he-IL', {
  style: 'currency',
  currency: 'ILS',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const NUMBER_FORMATTER = new Intl.NumberFormat('he-IL', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

export function formatIls(value: number): string {
  return ILS_FORMATTER.format(Number.isFinite(value) ? value : 0);
}

export function formatPercent(value: number): string {
  return `${NUMBER_FORMATTER.format(Number.isFinite(value) ? value : 0)}%`;
}

export function formatUpdatedAt(value: string | null): string {
  if (!value) return 'טרם נשמר';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'מועד עדכון לא ידוע';
  return new Intl.DateTimeFormat('he-IL', { dateStyle: 'short', timeStyle: 'short' }).format(date);
}
