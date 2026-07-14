import { ISRAEL_GEO_CONFIG } from './israel-geo.config';

export function getIsraelDate(date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: ISRAEL_GEO_CONFIG.timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}

export function getIsraelMonth(date = new Date()): string {
  return getIsraelDate(date).slice(0, 7);
}

export function getPreviousIsraelDate(israelDate: string): string {
  const date = new Date(`${israelDate}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

export function getWeekKey(date = new Date()): string {
  const israelDate = getIsraelDate(date);
  const monday = new Date(`${israelDate}T12:00:00Z`);
  monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7));
  return monday.toISOString().slice(0, 10);
}
