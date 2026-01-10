import type TelegramBot from 'node-telegram-bot-api';
import { MY_USER_ID } from '@core/config';
import { Logger } from '@core/utils';
import { getDateString } from '@core/utils';
import { sendShortenedMessage } from '@services/telegram';
import type { ChatbotService } from '../chatbot.service';

const logger = new Logger('FootballUpdateScheduler');

export async function footballUpdate(bot: TelegramBot, chatbotService: ChatbotService): Promise<void> {
  try {
    const prompt = `Generate a midday football update for today (${getDateString()}).
        Use the match_summary tool to get today's match results and ongoing matches.
        Format the message as:
        - Start with "⚽ Current status of today's matches:"
        - Include all matches (completed, ongoing, and upcoming)
        - Use the formatted text from the tool as it contains proper markdown
        - Keep it concise and informative
        - In the end of the message, point out the most exciting matches of the day
        - If no matches are found, say "No matches today"`;

    const response = await chatbotService.processMessage(prompt, MY_USER_ID);

    if (response?.message) {
      await sendShortenedMessage(bot, MY_USER_ID, response.message, { parse_mode: 'Markdown' });
    }
  } catch (err) {
    logger.error(`Failed to send football update: ${err}`);
  }
}
