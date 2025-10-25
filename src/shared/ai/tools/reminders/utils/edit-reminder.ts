import { getReminderById, updateReminder } from '@shared/reminders';

type EditReminderParams = {
  readonly chatId: number;
  readonly reminderId?: string;
  readonly message?: string;
  readonly dueDate?: string;
};

export async function handleEditReminder({ chatId, reminderId, message, dueDate }: EditReminderParams): Promise<string> {
  if (!reminderId) {
    return JSON.stringify({ success: false, error: 'reminderId is required for editing a reminder' });
  }

  const reminder = await getReminderById(reminderId, chatId);
  if (!reminder) {
    return JSON.stringify({ success: false, error: 'Reminder not found or you do not have permission to access it' });
  }

  const updates: any = {};
  if (message) updates.message = message;
  if (dueDate) {
    const parsedDate = new Date(dueDate);
    if (isNaN(parsedDate.getTime())) {
      return JSON.stringify({ success: false, error: 'Invalid date format. Please use ISO 8601 format' });
    }
    if (parsedDate <= new Date()) {
      return JSON.stringify({ success: false, error: 'Due date must be in the future' });
    }
    updates.dueDate = parsedDate;
  }

  if (Object.keys(updates).length === 0) {
    return JSON.stringify({ success: false, error: 'No updates provided. Please specify message or dueDate to update' });
  }

  const updated = await updateReminder(reminderId, chatId, updates);

  return JSON.stringify({
    success: updated,
    message: updated ? 'Reminder updated successfully' : 'Failed to update reminder',
    reminder: updated
      ? {
          id: reminder._id.toString(),
          message: updates.message || reminder.message,
          dueDate: updates.dueDate?.toISOString() || reminder.dueDate.toISOString(),
        }
      : undefined,
  });
}
