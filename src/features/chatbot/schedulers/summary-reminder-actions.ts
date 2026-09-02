import { InlineKeyboard } from 'grammy';
import type { Reminder } from '@shared/reminders';

export const SUMMARY_REMINDER_PREFIX = 'summary-reminder';

export type SummaryReminderAction = 'complete' | 'snooze-tomorrow';

// Telegram button labels get truncated on narrow screens, so keep the reminder text label short.
const MAX_LABEL_LENGTH = 40;

function truncateLabel(text: string): string {
  const collapsed = text.replace(/\s+/g, ' ').trim();
  return collapsed.length > MAX_LABEL_LENGTH ? `${collapsed.slice(0, MAX_LABEL_LENGTH - 1).trimEnd()}…` : collapsed;
}

export function buildSummaryReminderCallbackData(action: SummaryReminderAction, reminderId: string): string {
  return [SUMMARY_REMINDER_PREFIX, action, reminderId].join(':');
}

export type ParsedSummaryReminderCallback = {
  readonly action: SummaryReminderAction;
  readonly reminderId: string;
};

export function parseSummaryReminderCallbackData(data: string): ParsedSummaryReminderCallback | null {
  const [prefix, action, reminderId] = data.split(':');
  if (prefix !== SUMMARY_REMINDER_PREFIX || !reminderId) {
    return null;
  }
  if (action !== 'complete' && action !== 'snooze-tomorrow') {
    return null;
  }
  return { action: action as SummaryReminderAction, reminderId };
}

// Each reminder renders as a disabled label row (its text, no action) followed by a row with the two actions.
export function buildSummaryRemindersKeyboard(reminders: ReadonlyArray<Reminder>): InlineKeyboard | undefined {
  if (!reminders.length) {
    return undefined;
  }

  const keyboard = new InlineKeyboard();
  reminders.forEach((reminder, index) => {
    const id = reminder._id.toString();
    if (index > 0) {
      keyboard.row();
    }
    keyboard
      .disabled(`⏰ ${truncateLabel(reminder.message)}`)
      .row()
      .text('✅ Complete', buildSummaryReminderCallbackData('complete', id))
      .text('🌅 Snooze tomorrow', buildSummaryReminderCallbackData('snooze-tomorrow', id));
  });

  return keyboard;
}
