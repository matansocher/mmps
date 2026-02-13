import type { Bot } from 'grammy';
import { MY_USER_ID } from '@core/config';
import { Logger } from '@core/utils';
import { sendShortenedMessage } from '@services/telegram-grammy';
import { getTomorrowEvents } from '@shared/calendar-events';
import type { ChatbotService } from '../chatbot.service';
import { formatEventsForPrompt } from './utils/events';

const logger = new Logger('DailySummaryScheduler');

export async function dailySummary(bot: Bot, chatbotService: ChatbotService): Promise<void> {
  try {
    const events = await getTomorrowEvents();
    const calendarSection = events.length > 0 ? `Here are my calendar events for tomorrow:\n${formatEventsForPrompt(events)}` : 'No events scheduled for tomorrow.';

    const prompt = `Good evening! Please create my nightly summary with the following information:

**Weather for Tomorrow:**
Use the weather tool with action "tomorrow_hourly" for location "Kfar Saba" to get tomorrow's hourly weather forecast.
Format the weather data as: hour - degrees (e.g., "08:00 - 18°C")
Show 4 different times throughout the day (morning, noon, afternoon, and evening - e.g., 10:00, 14:00, 18:00, 22:00).

**Additional Information:**
1. **Calendar**: ${calendarSection}
   Format as a bulleted list where each event has its own bullet point.
2. **Birthday Reminders**: Check if any of tomorrow's calendar events are birthdays (events with "birthday" in the title). For each birthday you find:
   - Extract the person's name from the event title
   - If there are birthdays tomorrows, dont add the birthday section.
3. **Exercises**: Mention if I exercised today or not. Keep it brief (1-2 sentences max).

Please format the response nicely with emojis and make it feel like a friendly good night message. Start with a short warm greeting like "🌙 Good night!" and end with a message encouraging me to prepare for tomorrow's challenges.`;

    const response = await chatbotService.processMessage(prompt, MY_USER_ID);

    if (response?.message) {
      await sendShortenedMessage(bot, MY_USER_ID, response.message, { parse_mode: 'Markdown' });
    }
  } catch (err) {
    await bot.api.sendMessage(MY_USER_ID, '⚠️ Failed to create your nightly summary.');
    logger.error(`Failed to generate/send daily summary: ${err}`);
  }
}
