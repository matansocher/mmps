import { getRemindersByUser } from '@shared/reminders';

type ListRemindersParams = {
  readonly chatId: number;
};

export async function handleListReminders({ chatId }: ListRemindersParams): Promise<string> {
  const reminders = await getRemindersByUser(chatId, false);
  const count = reminders.length;

  return JSON.stringify({
    success: true,
    count,
    reminders: reminders.map((r) => ({
      id: r._id.toString(),
      message: r.message,
      dueDate: r.dueDate.toISOString(),
      status: r.status,
      createdAt: r.createdAt.toISOString(),
      snoozedUntil: r.snoozedUntil?.toISOString(),
    })),
  });
}
