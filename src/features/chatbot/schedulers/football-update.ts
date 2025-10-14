import type TelegramBot from 'node-telegram-bot-api';
import { Logger } from '@nestjs/common';
import { MY_USER_ID } from '@core/config';
import { getDateString } from '@core/utils';
import { sendShortenedMessage } from '@services/telegram';
import type { ChatbotService } from '../chatbot.service';

const logger = new Logger('FootballUpdateScheduler');

export async function footballUpdate(bot: TelegramBot, chatbotService: ChatbotService): Promise<void> {
  try {
    const prompt = `Generate a midday football update for today (${getDateString()}).
        Use the match_summary tool to get today's match results and ongoing matches.
        Format the message as:
        - Start with "⚽ המצב הנוכחי של משחקי היום:"
        - Include all matches (completed, ongoing, and upcoming)
        - Use the formatted text from the tool as it contains proper markdown
        - Keep it concise and informative
        - If no matches are found, say "אין משחקים היום"`;

    const response = await chatbotService.processMessage(prompt, MY_USER_ID);

    if (response?.message) {
      await sendShortenedMessage(bot, MY_USER_ID, response.message, { parse_mode: 'Markdown' });
    }
  } catch (err) {
    logger.error(`Failed to send football update: ${err}`);
  }
}
