export function isDateStringFormat(dateString: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(dateString);
}
