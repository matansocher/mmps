import type { Bot } from 'grammy';
import { z } from 'zod';
import { MY_USER_ID } from '@core/config';
import { Logger } from '@core/utils';
import { getDateString } from '@core/utils';
import { sendShortenedMessage } from '@services/telegram';
import type { ChatbotService } from '../chatbot.service';

const logger = new Logger('FootballUpdateScheduler');

const footballUpdateResponseSchema = z.object({
  hasMatches: z.boolean().describe('Whether there are any matches today'),
});

export async function footballUpdate(bot: Bot, chatbotService: ChatbotService): Promise<void> {
  try {
    const prompt = `Generate a midday football update for today (${getDateString()}).
        Use the match_summary tool to get today's match results and ongoing matches.
        If no matches are found, set hasMatches to false.
        Format the message as:
        - Start with "⚽ Current status of today's matches:"
        - Include all matches (completed, ongoing, and upcoming)
        - Use the formatted text from the tool as it contains proper markdown
        - Keep it concise and informative
        - In the end of the message, point out the most exciting matches of the day`;

    const { response, structured } = await chatbotService.processMessage(prompt, MY_USER_ID, footballUpdateResponseSchema);

    if (structured.hasMatches && response?.message) {
      const footer = '\n\n👉 [Coach Bot](https://t.me/mmps_football_coach_bot)';
      await sendShortenedMessage(bot, MY_USER_ID, `${response.message}${footer}`, { parse_mode: 'Markdown' });
    }
  } catch (err) {
    logger.error(`Failed to send football update: ${err}`);
  }
}
