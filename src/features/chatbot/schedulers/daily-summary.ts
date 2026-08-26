import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import type { Bot } from 'grammy';
import { DEFAULT_TIMEZONE, MY_USER_ID } from '@core/config';
import { getErrorMessage, Logger } from '@core/utils';
import { sendRichMessage } from '@services/telegram';
import { getTomorrowHourlyForecast } from '@services/weather';
import type { HourlyWeather } from '@services/weather';
import { getTomorrowEvents } from '@shared/calendar-events';
import type { CalendarEvent } from '@shared/calendar-events';
import { getRemindersByUser } from '@shared/reminders';
import type { Reminder } from '@shared/reminders';
import { CHATBOT_CONFIG } from '../chatbot.config';
import { formatEventTime } from './utils/events';

const logger = new Logger('chatbot:scheduler:daily-summary');

const SUMMARY_HOURS = [10, 14, 18, 22];

function isBirthday(event: CalendarEvent): boolean {
  return event.summary.toLowerCase().includes('birthday');
}

// Table cells take inline content only, so collapse whitespace and escape pipes.
function cell(text: string): string {
  return text.replace(/\s+/g, ' ').replace(/\|/g, '\\|').trim();
}

function buildWeatherTable(hourly: ReadonlyArray<HourlyWeather>): string {
  const rows = SUMMARY_HOURS.map((hour) => hourly.find((entry) => entry.hour === hour))
    .filter((entry): entry is HourlyWeather => !!entry)
    .map((entry) => `| ${String(entry.hour).padStart(2, '0')}:00 | ${Math.round(entry.temperature)}°C | ${cell(entry.condition)} |`);

  if (!rows.length) {
    return ['**🌤 Weather for tomorrow**', '', 'Not available'].join('\n');
  }
  return ['**🌤 Weather for tomorrow**', '', '| Time | Temp | Conditions |', '|:-----|-----:|:-----------|', ...rows].join('\n');
}

function buildCalendarTable(events: CalendarEvent[]): string {
  if (!events.length) {
    return ['**📅 Calendar**', '', 'Nothing scheduled'].join('\n');
  }
  const rows = events.map((event) => `| ${formatEventTime(event)} | ${cell(event.summary)} | ${cell(event.location ?? '')} |`);
  return ['**📅 Calendar**', '', '| Time | Event | Location |', '|:-----|:------|:---------|', ...rows].join('\n');
}

function buildBirthdaysSection(events: CalendarEvent[]): string | null {
  const birthdays = events.filter(isBirthday);
  if (!birthdays.length) {
    return null;
  }
  return ['**🎉 Birthdays**', '', ...birthdays.map((event) => `- 🎂 ${cell(event.summary)}`)].join('\n');
}

function formatReminderDueDate(dueDate: Date): string {
  return format(toZonedTime(dueDate, DEFAULT_TIMEZONE), 'yyyy-MM-dd HH:mm');
}

function buildRemindersSection(reminders: Reminder[]): string | null {
  if (!reminders.length) {
    return null;
  }
  const rows = reminders.map((reminder) => `| ${formatReminderDueDate(reminder.dueDate)} | ${cell(reminder.message)} |`);
  return ['**⏰ Unfinished reminders**', '', '| Due | Reminder |', '|:----|:---------|', ...rows].join('\n');
}

export async function dailySummary(bot: Bot): Promise<void> {
  try {
    const [forecast, events, reminders] = await Promise.all([
      getTomorrowHourlyForecast(CHATBOT_CONFIG.summaryLocation).catch((err) => {
        logger.error(`Failed to fetch tomorrow's forecast: ${getErrorMessage(err)}`);
        return null;
      }),
      getTomorrowEvents(),
      getRemindersByUser(MY_USER_ID).catch((err) => {
        logger.error(`Failed to fetch unfinished reminders: ${getErrorMessage(err)}`);
        return [] as Reminder[];
      }),
    ]);

    // Birthdays get their own section, so they are dropped from the calendar table to avoid listing them twice.
    const sections = [
      buildWeatherTable(forecast?.hourly ?? []),
      buildCalendarTable(events.filter((event) => !isBirthday(event))),
      buildBirthdaysSection(events),
      buildRemindersSection(reminders),
    ];

    await sendRichMessage(bot, MY_USER_ID, sections.filter(Boolean).join('\n\n'));
  } catch (err) {
    await bot.api.sendMessage(MY_USER_ID, '⚠️ Failed to create your nightly summary.').catch(() => {});
    logger.error(`Failed to generate/send daily summary: ${getErrorMessage(err)}`);
  }
}
