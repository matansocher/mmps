import { ObjectId } from 'mongodb';
import type { Reminder } from '@shared/reminders';
import { buildSummaryReminderCallbackData, buildSummaryRemindersKeyboard, parseSummaryReminderCallbackData } from './summary-reminder-actions';

function createReminder(message: string, id = new ObjectId()): Reminder {
  return {
    _id: id,
    chatId: 1,
    message,
    dueDate: new Date('2026-08-16T09:00:00+03:00'),
    status: 'pending',
    createdAt: new Date(),
  };
}

describe('buildSummaryReminderCallbackData()', () => {
  it('should join the prefix, action and id', () => {
    expect(buildSummaryReminderCallbackData('complete', 'abc')).toBe('summary-reminder:complete:abc');
    expect(buildSummaryReminderCallbackData('snooze-tomorrow', 'abc')).toBe('summary-reminder:snooze-tomorrow:abc');
  });
});

describe('parseSummaryReminderCallbackData()', () => {
  it('should parse valid callback data', () => {
    expect(parseSummaryReminderCallbackData('summary-reminder:complete:abc')).toEqual({ action: 'complete', reminderId: 'abc' });
    expect(parseSummaryReminderCallbackData('summary-reminder:snooze-tomorrow:abc')).toEqual({ action: 'snooze-tomorrow', reminderId: 'abc' });
  });

  it('should return null for a different prefix', () => {
    expect(parseSummaryReminderCallbackData('reminder:done:abc')).toBeNull();
  });

  it('should return null for an unknown action', () => {
    expect(parseSummaryReminderCallbackData('summary-reminder:delete:abc')).toBeNull();
  });

  it('should return null when the id is missing', () => {
    expect(parseSummaryReminderCallbackData('summary-reminder:complete')).toBeNull();
  });
});

describe('buildSummaryRemindersKeyboard()', () => {
  it('should return undefined when there are no reminders', () => {
    expect(buildSummaryRemindersKeyboard([])).toBeUndefined();
  });

  it('should build a label row and an action row per reminder', () => {
    const reminder = createReminder('Call plumber');
    const keyboard = buildSummaryRemindersKeyboard([reminder])!;
    const rows = keyboard.inline_keyboard;

    expect(rows).toHaveLength(2);
    expect(rows[0][0].text).toBe('⏰ Call plumber');
    expect(rows[1].map((button) => button.text)).toEqual(['✅ Complete', '🌅 Snooze tomorrow']);
    expect(rows[1].map((button) => (button as { callback_data: string }).callback_data)).toEqual([
      `summary-reminder:complete:${reminder._id.toString()}`,
      `summary-reminder:snooze-tomorrow:${reminder._id.toString()}`,
    ]);
  });

  it('should truncate long reminder labels', () => {
    const reminder = createReminder('a'.repeat(80));
    const keyboard = buildSummaryRemindersKeyboard([reminder])!;
    const label = keyboard.inline_keyboard[0][0].text;

    expect(label.length).toBeLessThan(80);
    expect(label.endsWith('…')).toBe(true);
  });

  it('should render one label row and one action row for every reminder', () => {
    const keyboard = buildSummaryRemindersKeyboard([createReminder('one'), createReminder('two')])!;
    expect(keyboard.inline_keyboard).toHaveLength(4);
  });
});
