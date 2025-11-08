import { DEFAULT_TIMEZONE } from '@core/config/main.config';

/**
 * Parses an ISO date string (without timezone) as if it's in Asia/Jerusalem time.
 * Automatically handles DST (UTC+2 in winter, UTC+3 in summer).
 *
 * @param dateString - ISO 8601 format without timezone (e.g., "2025-01-15T14:30:00")
 * @returns Date object with correct UTC time
 *
 * @example
 * parseJerusalemDate('2025-01-15T14:30:00') // Winter: stores as 12:30 UTC
 * parseJerusalemDate('2025-07-15T14:30:00') // Summer: stores as 11:30 UTC
 */
export function parseJerusalemDate(dateString: string): Date {
  const cleanDate = dateString.replace(/Z$|[+-]\d{2}:\d{2}$/, '');

  const [datePart, timePart] = cleanDate.split('T');
  const [year, month, day] = datePart.split('-').map(Number);
  const [hour, minute, second = 0] = (timePart || '00:00:00').split(':').map(Number);

  // Create a date string that Intl can parse correctly
  const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}`;

  // Use Intl.DateTimeFormat to format the date in Jerusalem timezone
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: DEFAULT_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZoneName: 'shortOffset',
  });

  // Create a temporary date to get the timezone offset
  const tempDate = new Date(year, month - 1, day, hour, minute, second);
  const parts = formatter.formatToParts(tempDate);

  // Extract offset from timeZoneName (e.g., "GMT+2" or "GMT+3")
  const offsetPart = parts.find((p) => p.type === 'timeZoneName');
  const offsetMatch = offsetPart?.value.match(/GMT([+-])(\d+)/);

  if (!offsetMatch) {
    // Fallback: assume UTC+2
    return new Date(Date.UTC(year, month - 1, day, hour - 2, minute, second));
  }

  const sign = offsetMatch[1] === '+' ? -1 : 1; // Note: inverted because we're converting TO UTC
  const offsetHours = parseInt(offsetMatch[2], 10);

  // Convert Jerusalem time to UTC by subtracting the offset
  return new Date(Date.UTC(year, month - 1, day, hour + sign * offsetHours, minute, second));
}
