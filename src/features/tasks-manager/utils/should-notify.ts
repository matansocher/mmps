import { getIntervalInMilliseconds } from './get-interval-in-milliseconds';

export function shouldNotify(task: any, now: Date): boolean {
  const { intervalUnits, intervalAmount, lastNotifiedAt } = task;

  const intervalInMs = getIntervalInMilliseconds(intervalUnits, intervalAmount);
  const lastNotifiedTime = new Date(lastNotifiedAt).getTime();
  const currentTime = now.getTime();

  return currentTime - lastNotifiedTime >= intervalInMs;
}
