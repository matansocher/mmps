import type TelegramBot from 'node-telegram-bot-api';
import { Logger } from '@nestjs/common';
import { MY_USER_ID } from '@core/config';
import { sendShortenedMessage } from '@services/telegram';
import type { ChatbotService } from '../chatbot.service';

const logger = new Logger('DailySummaryScheduler');

export async function dailySummary(bot: TelegramBot, chatbotService: ChatbotService): Promise<void> {
  try {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const prompt = `Good evening! Please create my nightly summary with the following information:

1. **Weather Forecast**: Get tomorrow's weather forecast for Kfar Saba (${tomorrow.toISOString().split('T')[0]}) - format as a single line with only the important data (temperature range, rain chance, general conditions).
2. **Calendar**: Check my calendar events for tomorrow. Format as:
   - List each event (just the name and time)
   - If no events, write "- no events"
3. **Exercises**: Mention if I exercised today or not. Keep it brief (1-2 sentences max).
4. **Fun Fact**: End with a fun fact related to todays date or if no something interesting, just a random fun fact.

Please format the response nicely with emojis and make it feel like a friendly good night message. Start with a short warm greeting like "🌙 Good night!" and end with a message encouraging me to prepare for tomorrow's challenges.`;

    const response = await chatbotService.processMessage(prompt, MY_USER_ID);

    if (response?.message) {
      await sendShortenedMessage(bot, MY_USER_ID, response.message, { parse_mode: 'Markdown' });
    }
  } catch (err) {
    await bot.sendMessage(MY_USER_ID, '⚠️ Failed to generate your nightly summary.');
    logger.error(`Failed to generate/send daily summary: ${err}`);
  }
}
