import { QUIET_HOURS } from '../tasks-manager-bot.config';

export function isWithinQuietHours(hour: number): boolean {
  const { start, end } = QUIET_HOURS;
  return hour >= start || hour < end;
}
