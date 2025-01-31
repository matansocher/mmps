import { toZonedTime } from 'date-fns-tz';
import { DEFAULT_TIMEZONE } from '@core/config';
import { getDateNumber } from './get-date-number';

export function getDateString(date?: Date): string {
  const finalDate = date || toZonedTime(new Date(), DEFAULT_TIMEZONE);
  return `${finalDate.getFullYear()}-${getDateNumber(finalDate.getMonth() + 1)}-${getDateNumber(finalDate.getDate())}`;
}
