import type { Bot } from 'grammy';
import { z } from 'zod';
import { MY_USER_ID } from '@core/config';
import { getErrorMessage, Logger } from '@core/utils';
import { getResponse } from '@services/openai';
import { GPT_SMALL_MODEL } from '@services/openai/constants';
import { sendShortenedMessage } from '@services/telegram';
import { getTomorrowHourlyForecast } from '@services/weather';
import type { HourlyWeather } from '@services/weather';
import { getTomorrowEvents } from '@shared/calendar-events';
import type { CalendarEvent } from '@shared/calendar-events';
import { CHATBOT_CONFIG } from '../chatbot.config';
import { formatEventsForPrompt } from './utils/events';

const logger = new Logger('chatbot:scheduler:daily-summary');

const SUMMARY_HOURS = [10, 14, 18, 22];

const DEFAULT_GREETING = '🌙 Good night!';
const DEFAULT_CLOSING = 'Get some rest and be ready for tomorrow 💪';

const summarySchema = z.object({
  greeting: z.string(),
  closing: z.string(),
});

function formatWeatherLines(hourly: ReadonlyArray<HourlyWeather>): string {
  return SUMMARY_HOURS.map((hour) => hourly.find((entry) => entry.hour === hour))
    .filter((entry): entry is HourlyWeather => !!entry)
    .map((entry) => `- ${String(entry.hour).padStart(2, '0')}:00 - ${Math.round(entry.temperature)}°C, ${entry.condition}`)
    .join('\n');
}

function formatBirthdayLines(events: CalendarEvent[]): string {
  return events
    .filter((event) => event.summary.toLowerCase().includes('birthday'))
    .map((event) => `- 🎂 ${event.summary}`)
    .join('\n');
}

function buildMessage(weather: string, events: string, birthdays: string, greeting: string, closing: string): string {
  const sections = [greeting, `*🌤 Weather for tomorrow*\n${weather || '- Not available'}`, `*📅 Calendar*\n${events || '- Nothing scheduled'}`];
  if (birthdays) {
    sections.push(`*🎉 Birthdays*\n${birthdays}`);
  }
  sections.push(closing);
  return sections.join('\n\n');
}

// The greeting and closing are the only parts that need an LLM; everything else is
// deterministic formatting, so this deliberately runs outside the agent (no tools, one call).
async function generateFraming(weather: string, events: string, birthdays: string): Promise<{ greeting: string; closing: string }> {
  const instructions = [
    `You write the opening and closing lines of a warm nightly summary message sent to one person over Telegram.`,
    `The greeting is a short good-night greeting starting with "🌙 Good night!".`,
    `The closing is one encouraging sentence about preparing for tomorrow.`,
    `Keep both to a single short sentence each. Do not repeat the weather or calendar details.`,
  ].join('\n');
  const input = [`Weather:\n${weather || 'unavailable'}`, `Calendar:\n${events || 'nothing scheduled'}`, `Birthdays:\n${birthdays || 'none'}`].join('\n\n');

  try {
    const { result } = await getResponse({ instructions, input, schema: summarySchema, model: GPT_SMALL_MODEL, store: false });
    return { greeting: result.greeting || DEFAULT_GREETING, closing: result.closing || DEFAULT_CLOSING };
  } catch (err) {
    logger.error(`Failed to generate summary framing, falling back to static text: ${getErrorMessage(err)}`);
    return { greeting: DEFAULT_GREETING, closing: DEFAULT_CLOSING };
  }
}

export async function dailySummary(bot: Bot): Promise<void> {
  try {
    const [forecast, events] = await Promise.all([
      getTomorrowHourlyForecast(CHATBOT_CONFIG.summaryLocation).catch((err) => {
        logger.error(`Failed to fetch tomorrow's forecast: ${getErrorMessage(err)}`);
        return null;
      }),
      getTomorrowEvents(),
    ]);

    const weather = forecast ? formatWeatherLines(forecast.hourly) : '';
    const calendar = events.length ? formatEventsForPrompt(events) : '';
    const birthdays = formatBirthdayLines(events);

    const { greeting, closing } = await generateFraming(weather, calendar, birthdays);

    await sendShortenedMessage(bot, MY_USER_ID, buildMessage(weather, calendar, birthdays, greeting, closing), { parse_mode: 'Markdown' });
  } catch (err) {
    await bot.api.sendMessage(MY_USER_ID, '⚠️ Failed to create your nightly summary.').catch(() => {});
    logger.error(`Failed to generate/send daily summary: ${getErrorMessage(err)}`);
  }
}
