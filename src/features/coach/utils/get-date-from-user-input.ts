import { getDateString, isDateStringFormat } from '@core/utils';
import { BOT_CONFIG } from '@features/coach/coach.config';

export function getDateFromUserInput(text: string): string {
  if (!text) {
    return getDateString();
  }
  if (!isDateStringFormat(text) && !BOT_CONFIG.keyboardOptions.includes(text)) {
    return getDateString();
  }
  if (isDateStringFormat(text)) {
    return getDateString(new Date(text));
  }

  const date = new Date();
  switch (text) {
    case 'היום':
      return getDateString();
    case 'מחר':
      date.setDate(date.getDate() + 1);
      return getDateString(date);
    case 'מחרתיים':
      date.setDate(date.getDate() + 2);
      return getDateString(date);
    case 'אתמול':
      date.setDate(date.getDate() - 1);
      return getDateString(date);
    default:
      return getDateString();
  }
}
