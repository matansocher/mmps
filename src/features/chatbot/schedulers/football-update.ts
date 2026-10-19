import type { Bot } from 'grammy';
import { z } from 'zod';
import { MY_USER_ID } from '@core/config';
import { getErrorMessage, Logger } from '@core/utils';
import { getDateString } from '@core/utils';
import { sendImageThenText, sendShortenedMessage } from '@services/telegram';
import { detectLanguage } from '@shared/image-card';
import { generateMatchCardsImage } from '@shared/sports';
import type { ChatbotService } from '../chatbot.service';
import { collectMatchCardGroups, MATCH_SUMMARY_TOOL_NAME } from '../tool-images';

const logger = new Logger('chatbot:scheduler:football-update');

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
        - All matches are sent as an image above your message, so do not list every match
        - Briefly cover notable results and live matches, then point out the most exciting matches of the day`;

    const { response, structured } = await chatbotService.processMessage(prompt, MY_USER_ID, footballUpdateResponseSchema);

    if (structured.hasMatches && response?.message) {
      const footer = '\n\n👉 [Coach Bot](https://t.me/mmps_football_coach_bot)';
      const groups = collectMatchCardGroups(response.toolResults, [MATCH_SUMMARY_TOOL_NAME]);
      await sendImageThenText(bot, MY_USER_ID, {
        image: () => (groups.length ? generateMatchCardsImage(groups, detectLanguage(response.message)) : null),
        fileName: 'football-matches.png',
        text: `${response.message}${footer}`,
        sendText: (b, chatId, text) => sendShortenedMessage(b, chatId, text, { parse_mode: 'Markdown' }),
      });
    }
  } catch (err) {
    logger.error(`Failed to send football update: ${getErrorMessage(err)}`);
  }
}
