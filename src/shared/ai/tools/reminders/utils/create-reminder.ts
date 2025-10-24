import { createReminder } from '@shared/reminders';

type CreateReminderParams = {
  readonly chatId: number;
  readonly message?: string;
  readonly dueDate?: string;
};

export async function handleCreateReminder({ chatId, message, dueDate }: CreateReminderParams): Promise<string> {
  if (!message || !dueDate) {
    return JSON.stringify({ success: false, error: 'Both message and dueDate are required for creating a reminder' });
  }

  const parsedDate = new Date(dueDate);
  if (isNaN(parsedDate.getTime())) {
    return JSON.stringify({ success: false, error: 'Invalid date format. Please use ISO 8601 format (e.g., 2025-01-15T14:30:00Z)' });
  }

  if (parsedDate <= new Date()) {
    return JSON.stringify({ success: false, error: 'Due date must be in the future' });
  }

  const result = await createReminder({ chatId, message, dueDate: parsedDate });

  return JSON.stringify({
    success: true,
    reminderId: result.insertedId.toString(),
    message: 'Reminder created successfully',
    reminder: {
      id: result.insertedId.toString(),
      message,
      dueDate: parsedDate.toISOString(),
    },
  });
}
