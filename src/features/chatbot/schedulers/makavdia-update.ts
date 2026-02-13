import type { Bot } from 'grammy';
import { MY_USER_ID } from '@core/config';
import { Logger } from '@core/utils';
import { getDateString } from '@core/utils';
import { sendShortenedMessage } from '@services/telegram-grammy';
import type { ChatbotService } from '../chatbot.service';

const logger = new Logger('MakavdiaUpdateScheduler');

export async function makavdiaUpdate(bot: Bot, chatbotService: ChatbotService): Promise<void> {
  try {
    const prompt = `Generate a summary of Deni Avdija's latest NBA performance for today (${getDateString()}).
        Use the makavdia tool that will return his latest 5 games with comprehensive statistics. Use only the latest game to report to the user.

        The response from the tool will always return the latest 5 games, so check if the latest game was played today or not.
        If the last game was not played today or the latest game's date is not today's date, inform the user that there was no game today.

        If the latest game was played today, Format the message as follows:
        - Start with "🏀 Makavdia - ${getDateString()}"
        - Focus on the most recent game (check if it was played today or recently)
        - Mention the opponent team, final score, and game outcome (win/loss)
        - Include key statistics: points, rebounds, assists, shooting percentages`;

    const response = await chatbotService.processMessage(prompt, MY_USER_ID);

    if (response?.message) {
      await sendShortenedMessage(bot, MY_USER_ID, response.message, { parse_mode: 'Markdown' });
    }
  } catch (err) {
    logger.error(`Failed to send makavdia update: ${err}`);
  }
}
