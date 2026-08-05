import { addDays, set } from 'date-fns';
import { fromZonedTime, toZonedTime } from 'date-fns-tz';
import { InlineKeyboard } from 'grammy';
import { DEFAULT_TIMEZONE } from '@core/config';

export const REMINDER_ACTION_PREFIX = 'reminder';

export type ReminderAction = 'snooze' | 'done';
export type ReminderSnoozeOption = '1h' | '3h' | 'morning';

const TOMORROW_MORNING_HOUR = 9;

export function buildReminderCallbackData(action: ReminderAction, reminderId: string, option?: ReminderSnoozeOption): string {
  return [REMINDER_ACTION_PREFIX, action, reminderId, option].filter(Boolean).join(':');
}

export type ParsedReminderCallback = {
  readonly action: ReminderAction;
  readonly reminderId: string;
  readonly option?: ReminderSnoozeOption;
};

export function parseReminderCallbackData(data: string): ParsedReminderCallback | null {
  const [prefix, action, reminderId, option] = data.split(':');
  if (prefix !== REMINDER_ACTION_PREFIX || !reminderId) {
    return null;
  }
  if (action !== 'snooze' && action !== 'done') {
    return null;
  }
  return { action: action as ReminderAction, reminderId, option: option as ReminderSnoozeOption | undefined };
}

export function buildReminderKeyboard(reminderId: string): InlineKeyboard {
  return new InlineKeyboard()
    .text('😴 1h', buildReminderCallbackData('snooze', reminderId, '1h'))
    .text('😴 3h', buildReminderCallbackData('snooze', reminderId, '3h'))
    .row()
    .text('🌅 Tomorrow morning', buildReminderCallbackData('snooze', reminderId, 'morning'))
    .row()
    .text('✅ Done', buildReminderCallbackData('done', reminderId));
}

export function resolveSnoozeUntil(option: ReminderSnoozeOption, now: Date = new Date()): Date {
  switch (option) {
    case '1h':
      return new Date(now.getTime() + 60 * 60 * 1000);
    case '3h':
      return new Date(now.getTime() + 3 * 60 * 60 * 1000);
    case 'morning': {
      const zonedNow = toZonedTime(now, DEFAULT_TIMEZONE);
      const zonedTomorrowMorning = set(addDays(zonedNow, 1), { hours: TOMORROW_MORNING_HOUR, minutes: 0, seconds: 0, milliseconds: 0 });
      return fromZonedTime(zonedTomorrowMorning, DEFAULT_TIMEZONE);
    }
  }
}

export function describeSnoozeOption(option: ReminderSnoozeOption): string {
  switch (option) {
    case '1h':
      return '1 hour';
    case '3h':
      return '3 hours';
    case 'morning':
      return 'tomorrow morning';
  }
}
