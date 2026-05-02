import type { Bot } from 'grammy';
import { MY_USER_ID } from '@core/config';
import { Logger } from '@core/utils';
import { sendShortenedMessage } from '@services/telegram';
import { getTodayEvents } from '@shared/calendar-events';

const logger = new Logger('BirthdayReminderScheduler');

export async function birthdayReminder(bot: Bot): Promise<void> {
  try {
    const events = await getTodayEvents();
    const birthdays = events.filter((event) => event.start.date && event.summary.toLowerCase().includes('birthday'));

    if (!birthdays.length) {
      return;
    }

    const lines = birthdays.map((event) => `🎂 ${event.summary}`).join('\n');
    await sendShortenedMessage(bot, MY_USER_ID, `🎉 Birthday reminder!\n\n${lines}\n\nDon't forget to congratulate!`, { parse_mode: 'Markdown' });
  } catch (err) {
    logger.error(`Failed to send birthday reminder: ${err}`);
  }
}
