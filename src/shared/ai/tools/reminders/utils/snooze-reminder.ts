import { getReminderById, updateReminderStatus } from '@shared/reminders';

type SnoozeReminderParams = {
  readonly chatId: number;
  readonly reminderId?: string;
  readonly snoozeMinutes: number;
};

export async function handleSnoozeReminder({ chatId, reminderId, snoozeMinutes }: SnoozeReminderParams): Promise<string> {
  if (!reminderId) {
    return JSON.stringify({ success: false, error: 'reminderId is required for snoozing a reminder' });
  }

  const reminder = await getReminderById(reminderId, chatId);
  if (!reminder) {
    return JSON.stringify({ success: false, error: 'Reminder not found or you do not have permission to access it' });
  }

  const snoozeUntil = new Date(Date.now() + snoozeMinutes * 60 * 1000);
  const updated = await updateReminderStatus(reminderId, chatId, 'snoozed', snoozeUntil);

  return JSON.stringify({
    success: updated,
    message: updated ? `Reminder snoozed for ${snoozeMinutes} minutes` : 'Failed to snooze reminder',
    reminder: updated
      ? {
          id: reminder._id.toString(),
          message: reminder.message,
          snoozedUntil: snoozeUntil.toISOString(),
        }
      : undefined,
  });
}
