import { INTERVAL_UNITS } from '@core/mongo/tasks-manager-mongo/models/task.model';
import { QUIET_HOURS, TASKS_MANAGER_BOT_OPTIONS } from '@features/tasks-manager/tasks-manager-bot.config';

export interface TaskDetails {
  title: string;
  intervalUnits: INTERVAL_UNITS | string;
  intervalAmount: number;
}

export function validateUserTaskInput(input: string): boolean {
  const [interval, title] = input.split(' - ');
  if (!interval || !title) {
    return false;
  }
  const [intervalAmount, intervalUnits] = interval.split('');
  if (!intervalAmount || !intervalUnits) {
    return false;
  }
  if (isNaN(parseInt(intervalAmount))) {
    return false;
  }
  return true;
}

export function getTaskDetails(input: string): TaskDetails {
  const [interval, title] = input.split(' - ');
  const [intervalAmount, intervalUnits] = interval.split('');
  return {
    title,
    intervalUnits,
    intervalAmount: parseInt(intervalAmount),
  };
}

export function getKeyboardOptions() {
  return {
    reply_markup: {
      keyboard: Object.keys(TASKS_MANAGER_BOT_OPTIONS).map((option) => {
        return [{ text: TASKS_MANAGER_BOT_OPTIONS[option] }];
      }),
      resize_keyboard: true,
    },
  };
}

export function isWithinQuietHours(hour: number): boolean {
  const { start, end } = QUIET_HOURS;
  return hour >= start || hour < end;
}

export function shouldNotify(task: any, now: Date): boolean {
  const { intervalUnits, intervalAmount, lastNotifiedAt } = task;

  const intervalInMs = getIntervalInMilliseconds(intervalUnits, intervalAmount);
  const lastNotifiedTime = new Date(lastNotifiedAt).getTime();
  const currentTime = now.getTime();

  return currentTime - lastNotifiedTime >= intervalInMs;
}

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
