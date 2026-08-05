import { endOfDay } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import type { Bot } from 'grammy';
import { DEFAULT_TIMEZONE, MY_USER_ID } from '@core/config';
import { Logger } from '@core/utils';
import { sendShortenedMessage } from '@services/telegram';
import { getTodayEvents } from '@shared/calendar-events';
import { getPendingRemindersDueOnOrBefore } from '@shared/reminders';
import type { ChatbotService } from '../chatbot.service';
import { formatEventsForPrompt } from './utils/events';

const logger = new Logger('MorningBriefScheduler');

const WEATHER_LOCATION = 'Kfar Saba';

export async function morningBrief(bot: Bot, chatbotService: ChatbotService): Promise<void> {
  try {
    const now = new Date();
    const endOfToday = endOfDay(toZonedTime(now, DEFAULT_TIMEZONE));

    const [events, dueReminders] = await Promise.all([getTodayEvents(), getPendingRemindersDueOnOrBefore(MY_USER_ID, endOfToday)]);

    const calendarSection = events.length > 0 ? `Here are my calendar events for today:\n${formatEventsForPrompt(events)}` : 'No events scheduled for today.';

    const remindersSection = dueReminders.length > 0 ? `Here are my reminders due today:\n${dueReminders.map((reminder) => `- ${reminder.message}`).join('\n')}` : 'No reminders due today.';

    const prompt = `Good morning! Please create my morning brief with the following information:

**Weather for Today:**
Use the weather tool with action "current" for location "${WEATHER_LOCATION}" to get the current conditions.
Summarize the weather in one short, friendly line (temperature and conditions, whether I should take an umbrella or dress warm).

**Calendar:**
${calendarSection}
Format as a bulleted list where each event has its own bullet point. Do NOT use the calendar tool — the data is already provided above.

**Reminders due today:**
${remindersSection}
Format as a bulleted list. Do NOT use the reminders tool — the data is already provided above.

**Unread Email:**
Use the gmail tool with action "list" and query "is:unread" to fetch my unread emails.
Report only the count and, if there are any, a one-line summary of the most important 1-3 (sender + subject). Keep it brief.

Please format the response nicely with emojis and make it feel like a friendly good morning message. Start with a short warm greeting like "☀️ Good morning!" and end with a short encouraging note to start the day.`;

    const response = await chatbotService.processMessage(prompt, MY_USER_ID);

    if (response?.message) {
      await sendShortenedMessage(bot, MY_USER_ID, response.message, { parse_mode: 'Markdown' });
    }
  } catch (err) {
    await bot.api.sendMessage(MY_USER_ID, '⚠️ Failed to create your morning brief.').catch(() => {});
    logger.error(`Failed to generate/send morning brief: ${err}`);
  }
}
