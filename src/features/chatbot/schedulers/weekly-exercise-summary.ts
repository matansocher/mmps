import type TelegramBot from 'node-telegram-bot-api';
import { MY_USER_ID } from '@core/config';
import { Logger } from '@core/utils';
import type { ChatbotService } from '../chatbot.service';

const logger = new Logger('WeeklyExerciseSummaryScheduler');

export async function weeklyExerciseSummary(bot: TelegramBot, chatbotService: ChatbotService): Promise<void> {
  try {
    const prompt = `Generate my weekly exercise summary.
    Use the exercise_analytics tool with action "weekly_summary" to get my weekly stats.
    Format the response with:
    - Last week's exercise days (show which days I exercised)
    - Weekly rating with stars
    - Current streak and longest streak
    - Encouraging message for the upcoming week
    Use emojis to make it engaging and motivational.`;

    const response = await chatbotService.processMessage(prompt, MY_USER_ID);

    if (response?.message) {
      await bot.sendMessage(MY_USER_ID, response.message, { parse_mode: 'Markdown' });
    }
  } catch (err) {
    logger.error(`Failed to send weekly exercise summary: ${err}`);
  }
}
