import { deleteReminder, getReminderById } from '@shared/reminders';

type DeleteReminderParams = {
  readonly chatId: number;
  readonly reminderId?: string;
};

export async function handleDeleteReminder({ chatId, reminderId }: DeleteReminderParams): Promise<string> {
  if (!reminderId) {
    return JSON.stringify({ success: false, error: 'reminderId is required for deleting a reminder' });
  }

  const reminder = await getReminderById(reminderId, chatId);
  if (!reminder) {
    return JSON.stringify({ success: false, error: 'Reminder not found or you do not have permission to access it' });
  }

  const deleted = await deleteReminder(reminderId, chatId);
  return JSON.stringify({ success: deleted, message: deleted ? 'Reminder deleted successfully' : 'Failed to delete reminder' });
}
