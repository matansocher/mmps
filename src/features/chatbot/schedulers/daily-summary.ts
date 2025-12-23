import type TelegramBot from 'node-telegram-bot-api';
import { MY_USER_ID } from '@core/config';
import { Logger } from '@core/utils';
import { sendShortenedMessage } from '@services/telegram';
import type { ChatbotService } from '../chatbot.service';

const logger = new Logger('DailySummaryScheduler');

export async function dailySummary(bot: TelegramBot, chatbotService: ChatbotService): Promise<void> {
  try {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const prompt = `Good evening! Please create my nightly summary with the following information:

**Weather for Tomorrow:**
Use the weather tool with action "tomorrow_hourly" for location "Kfar Saba" to get tomorrow's hourly weather forecast.
Format the weather data as: hour - degrees (e.g., "08:00 - 18°C")
Show 4 different times throughout the day (morning, noon, afternoon, and evening - e.g., 10:00, 14:00, 18:00, 22:00).

**Additional Information:**
1. **Calendar**: Check my calendar events for tomorrow. Format as:
   - List each event with the time and name data only
   - If no events, dont add the calendar section.
2. **Birthday Reminders**: Check if any of tomorrow's calendar events are birthdays (events with "birthday" in the title). For each birthday you find:
   - Extract the person's name from the event title
   - If there are birthdays tomorrows, dont add the birthday section.
3. **Exercises**: Mention if I exercised today or not. Keep it brief (1-2 sentences max).

Please format the response nicely with emojis and make it feel like a friendly good night message. Start with a short warm greeting like "🌙 לילה טוב!" and end with a message encouraging me to prepare for tomorrow's challenges.`;

    const response = await chatbotService.processMessage(prompt, MY_USER_ID);

    if (response?.message) {
      await sendShortenedMessage(bot, MY_USER_ID, response.message, { parse_mode: 'Markdown' });
    }
  } catch (err) {
    await bot.sendMessage(MY_USER_ID, '⚠️ נכשל ביצירת הסיכום הלילי שלך.');
    logger.error(`Failed to generate/send daily summary: ${err}`);
  }
}
