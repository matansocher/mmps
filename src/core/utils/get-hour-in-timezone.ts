export function getHourInTimezone(timeZone: string): number {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: 'numeric',
    hour12: false,
  });
  return parseInt(formatter.format(new Date()));
}
