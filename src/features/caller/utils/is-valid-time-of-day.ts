export function isValidTimeOfDay(input: string): boolean {
  if (!/^\d{4}$/.test(input)) return false;

  const hours = parseInt(input.slice(0, 2), 10);
  const minutes = parseInt(input.slice(2, 4), 10);

  return hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59;
}
