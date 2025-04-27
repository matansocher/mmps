import { DEFAULT_DAILY_AMOUNT, INTERVAL_HOURS_BY_PRIORITY } from '../worldly.config';

export const filterSubscriptions = (dailyAmount: number) => {
  const indexOfCurrentHour = INTERVAL_HOURS_BY_PRIORITY.findIndex((hour) => hour === new Date().getUTCHours());
  if (indexOfCurrentHour === -1 || dailyAmount === 0) {
    return false;
  }
  if (!dailyAmount) {
    dailyAmount = DEFAULT_DAILY_AMOUNT;
  }
  return indexOfCurrentHour < dailyAmount;
};
