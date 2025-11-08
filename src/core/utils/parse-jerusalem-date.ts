export function parseJerusalemDate(dateString: string, timeZone: string): Date {
  const cleanDate = dateString.replace(/Z$|[+-]\d{2}:\d{2}$/, '');

  const [datePart, timePart] = cleanDate.split('T');
  const [year, month, day] = datePart.split('-').map(Number);
  const [hour, minute, second = 0] = (timePart || '00:00:00').split(':').map(Number);

  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZoneName: 'shortOffset',
  });

  const tempDate = new Date(year, month - 1, day, hour, minute, second);
  const parts = formatter.formatToParts(tempDate);

  const offsetPart = parts.find((p) => p.type === 'timeZoneName');
  const offsetMatch = offsetPart?.value.match(/GMT([+-])(\d+)/);

  if (!offsetMatch) {
    return new Date(Date.UTC(year, month - 1, day, hour - 2, minute, second));
  }

  const sign = offsetMatch[1] === '+' ? -1 : 1; // Note: inverted because we're converting TO UTC
  const offsetHours = parseInt(offsetMatch[2], 10);

  return new Date(Date.UTC(year, month - 1, day, hour + sign * offsetHours, minute, second));
}
