import { getDateString } from './get-date-string';

export function getDateDescription(date: Date): string {
  const today = new Date();

  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);

  const diff = (date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);

  if (diff === 0) return 'היום';
  if (diff === 1) return 'מחר';
  if (diff === -1) return 'אתמול';

  return getDateString(date);
}
