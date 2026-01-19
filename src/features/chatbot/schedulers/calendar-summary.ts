import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import type TelegramBot from 'node-telegram-bot-api';
import { DEFAULT_TIMEZONE, MY_USER_ID } from '@core/config';
import { Logger } from '@core/utils';
import { sendShortenedMessage } from '@services/telegram';
import { type CalendarEvent, getTodayEvents } from '@shared/calendar-events';
import type { ChatbotService } from '../chatbot.service';

const logger = new Logger('CalendarSummaryScheduler');

function formatEventTime({ start, end }: CalendarEvent): string {
  if (start.dateTime && end.dateTime) {
    const startZoned = toZonedTime(new Date(start.dateTime), DEFAULT_TIMEZONE);
    const endZoned = toZonedTime(new Date(end.dateTime), DEFAULT_TIMEZONE);
    const startTime = format(startZoned, 'HH:mm');
    const endTime = format(endZoned, 'HH:mm');
    return `${startTime}-${endTime}`;
  }
  return 'All day';
}

function formatEventsForPrompt(events: CalendarEvent[]): string {
  return events
    .map((event) => {
      const time = formatEventTime(event);
      const location = event.location ? ` (Location: ${event.location})` : '';
      return `- ${time}: ${event.summary}${location}`;
    })
    .join('\n');
}

export async function calendarSummary(bot: TelegramBot, chatbotService: ChatbotService): Promise<void> {
  try {
    const events = await getTodayEvents();

    if (events.length === 0) {
      await sendShortenedMessage(bot, MY_USER_ID, '🌝 Good night! You have no calendar events scheduled for today. Enjoy your free day!');
      return;
    }

    const formattedEvents = formatEventsForPrompt(events);

    const prompt = `Good Night! Here are my calendar events for today:

${formattedEvents}

Please create a brief, friendly summary of my day ahead. Format the events as a bulleted list where each event has its own bullet point. Keep the summary concise.`;

    const response = await chatbotService.processMessage(prompt, MY_USER_ID);

    if (response?.message) {
      await sendShortenedMessage(bot, MY_USER_ID, response.message, { parse_mode: 'Markdown' });
    }
  } catch (err) {
    await bot.sendMessage(MY_USER_ID, '⚠️ Failed to create your daily calendar summary.');
    logger.error(`Failed to generate/send calendar summary: ${err}`);
  }
}
