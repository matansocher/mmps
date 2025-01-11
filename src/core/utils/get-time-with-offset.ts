export function getTimeWithOffset(date: Date, time: string): string {
  const [hours, minutes] = time.split(':').map(Number);
  const localDateTime = new Date(Number(date.getFullYear()), Number(date.getMonth()), Number(date.getDate()), hours, minutes);
  const offsetInMilliseconds = this.getTimezoneOffset() * 60 * 60 * 1000;
  const utcDateTime = new Date(localDateTime.getTime() - offsetInMilliseconds);
  return utcDateTime.toISOString();
}
