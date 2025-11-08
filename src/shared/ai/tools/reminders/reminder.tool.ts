import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { MY_USER_ID } from '@core/config';
import { handleCompleteReminder, handleCreateReminder, handleDeleteReminder, handleEditReminder, handleListReminders, handleSnoozeReminder } from './utils';

const schema = z.object({
  action: z.enum(['create', 'list', 'complete', 'delete', 'edit', 'snooze']).describe('The action to perform'),
  message: z.string().optional().describe('The reminder message text (required for create and edit actions)'),
  dueDate: z.string().optional().describe('The due date in ISO 8601 format in local timezone (e.g., 2025-01-15T14:30:00) (required for create, optional for edit)'),
  reminderId: z.string().optional().describe('The reminder ID (required for complete, delete, edit, and snooze actions)'),
  snoozeMinutes: z.number().optional().default(60).describe('Number of minutes to snooze the reminder (default: 60)'),
});

async function runner({ action, message, dueDate, reminderId, snoozeMinutes = 60 }: z.infer<typeof schema>): Promise<string> {
  try {
    const chatId = MY_USER_ID;

    switch (action) {
      case 'create':
        return handleCreateReminder({ chatId, message, dueDate });

      case 'list':
        return handleListReminders({ chatId });

      case 'complete':
        return handleCompleteReminder({ chatId, reminderId });

      case 'delete':
        return handleDeleteReminder({ chatId, reminderId });

      case 'edit':
        return handleEditReminder({ chatId, reminderId, message, dueDate });

      case 'snooze':
        return handleSnoozeReminder({ chatId, reminderId, snoozeMinutes });

      default:
        return JSON.stringify({ success: false, error: `Unknown action: ${action}` });
    }
  } catch (err) {
    return JSON.stringify({ success: false, error: `Failed to ${action} reminder: ${err.message}` });
  }
}

export const reminderTool = tool(runner, {
  name: 'smart_reminders',
  description: `Manage smart reminders for the user. This tool allows creating, listing, editing, completing, deleting, and snoozing reminders.

Actions:
- create: Create a new reminder with a message and due date (ISO 8601 format in local timezone)
- list: List all pending and snoozed reminders
- complete: Mark a reminder as completed by ID
- delete: Delete a reminder by ID
- edit: Update a reminder's message or due date by ID
- snooze: Snooze a reminder for a specified number of minutes (default: 60)

When the user mentions saving something for later, setting a reminder, or asking to be reminded about something, use this tool to create a reminder.
Parse natural language dates and times into ISO 8601 format in the user's local timezone (without Z suffix) before calling this tool.

Examples:
- "Remind me to call mom tomorrow at 3pm" → create with dueDate
- "What are my reminders?" → list
- "Mark the first reminder as done" → complete with reminderId
- "Delete the reminder about the meeting" → delete with reminderId
- "Change my reminder to next week" → edit with new dueDate
- "Snooze that reminder for 2 hours" → snooze with snoozeMinutes: 120`,
  schema,
});
