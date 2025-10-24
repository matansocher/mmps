import type TelegramBot from 'node-telegram-bot-api';
import { Logger } from '@nestjs/common';
import { DEFAULT_TIMEZONE } from '@core/config';
import { getDueReminders, reactivateSnoozedReminders, updateReminderStatus } from '@shared/reminders';

const logger = new Logger('ReminderCheckScheduler');

export async function reminderCheck(bot: TelegramBot): Promise<void> {
  try {
    const reactivatedCount = await reactivateSnoozedReminders();
    if (reactivatedCount > 0) {
      logger.log(`Reactivated ${reactivatedCount} snoozed reminder(s)`);
    }

    const dueReminders = await getDueReminders();

    if (dueReminders.length === 0) {
      logger.log('No due reminders to send');
      return;
    }

    logger.log(`Found ${dueReminders.length} due reminder(s) to send`);

    for (const reminder of dueReminders) {
      try {
        const message = `🔔 *Reminder*\n\n${reminder.message}\n\n_Due: ${reminder.dueDate.toLocaleString('en-US', {
          timeZone: DEFAULT_TIMEZONE,
          dateStyle: 'full',
          timeStyle: 'short',
        })}_`;

        await bot.sendMessage(reminder.chatId, message, { parse_mode: 'Markdown' });

        await updateReminderStatus(reminder._id, reminder.chatId, 'completed');

        logger.log(`Sent reminder ${reminder._id.toString()} to chat ${reminder.chatId}`);
      } catch (err) {
        logger.error(`Failed to send reminder ${reminder._id.toString()} to chat ${reminder.chatId}: ${err.message}`);
      }
    }

    logger.log(`Successfully processed ${dueReminders.length} reminder(s)`);
  } catch (err) {
    logger.error(`Failed to check reminders: ${err.message}`);
  }
}
