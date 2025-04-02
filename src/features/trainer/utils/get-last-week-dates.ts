export function getLastWeekDates(): { lastSunday: Date; lastSaturday: Date } {
  const now = new Date();
  const lastSunday = new Date(now);
  lastSunday.setDate(now.getDate() - now.getDay());
  lastSunday.setHours(0, 0, 0, 0);

  const lastSaturday = new Date(lastSunday);
  lastSaturday.setDate(lastSunday.getDate() + 6);
  lastSaturday.setHours(23, 59, 59, 999);

  return { lastSunday, lastSaturday };
}
