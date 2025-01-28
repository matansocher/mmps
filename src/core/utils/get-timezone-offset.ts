import { DEFAULT_TIMEZONE } from '@core/config';

export function getTimezoneOffset(): number {
  const formatter = new Intl.DateTimeFormat('en-US', { timeZone: DEFAULT_TIMEZONE, timeZoneName: 'short' });
  const parts = formatter.formatToParts(new Date());
  const timeZoneName = parts.find((part) => part.type === 'timeZoneName')?.value || '';
  const match = /GMT([+-]\d+)/.exec(timeZoneName);
  return match ? parseInt(match[1], 10) : 0;
}
