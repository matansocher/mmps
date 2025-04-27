import { INTERVAL_HOURS_BY_PRIORITY } from '../worldly.config';

export const filterSubscriptions = (dailyAmount: number) => {
  return false;
  // if (!dailyAmount) {
  //   return true;
  // }
  // const indexOfCurrentHour = INTERVAL_HOURS_BY_PRIORITY.findIndex((hour) => hour === new Date().getUTCHours());
  // if (indexOfCurrentHour === -1) {
  //   return false;
  // }
  // return dailyAmount >= indexOfCurrentHour;
};
