import { getReminderById, updateReminderStatus } from '@shared/reminders';

type CompleteReminderParams = {
  readonly chatId: number;
  readonly reminderId?: string;
};

export async function handleCompleteReminder({ chatId, reminderId }: CompleteReminderParams): Promise<string> {
  if (!reminderId) {
    return JSON.stringify({ success: false, error: 'reminderId is required for completing a reminder' });
  }

  const reminder = await getReminderById(reminderId, chatId);
  if (!reminder) {
    return JSON.stringify({ success: false, error: 'Reminder not found or you do not have permission to access it' });
  }

  const updated = await updateReminderStatus(reminderId, chatId, 'completed');

  return JSON.stringify({
    success: updated,
    message: updated ? 'Reminder marked as completed' : 'Failed to update reminder',
    reminder: updated
      ? {
          id: reminder._id.toString(),
          message: reminder.message,
          completedAt: new Date().toISOString(),
        }
      : undefined,
  });
}
