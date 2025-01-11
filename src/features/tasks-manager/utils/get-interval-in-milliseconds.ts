import { INTERVAL_UNITS } from '@core/mongo/tasks-manager-mongo/models/task.model';

export function getIntervalInMilliseconds(units: string, amount: number): number {
  const hourInMs = 60 * 60 * 1000; // 1 hour in milliseconds
  switch (units) {
    case INTERVAL_UNITS.HOUR:
      return amount * hourInMs;
    case INTERVAL_UNITS.DAY:
      return amount * 24 * hourInMs;
    case INTERVAL_UNITS.WEEK:
      return amount * 7 * 24 * hourInMs;
    case INTERVAL_UNITS.MONTH:
      return amount * 30 * 7 * 24 * hourInMs;
    default:
      throw new Error(`Invalid interval unit: ${units}`);
  }
}
