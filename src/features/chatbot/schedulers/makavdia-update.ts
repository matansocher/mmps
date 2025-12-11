import type TelegramBot from 'node-telegram-bot-api';
import { MY_USER_ID } from '@core/config';
import { Logger } from '@core/utils';
import { getDateString } from '@core/utils';
import { sendShortenedMessage } from '@services/telegram';
import type { ChatbotService } from '../chatbot.service';

const logger = new Logger('MakavdiaUpdateScheduler');

export async function makavdiaUpdate(bot: TelegramBot, chatbotService: ChatbotService): Promise<void> {
  try {
    const prompt = `Generate a summary of Deni Avdija's (מעקבדיה) latest NBA performance for today (${getDateString()}).
        Use the makavdia tool to get his latest 5 games with comprehensive statistics.

        Format the message as follows:
        - Start with "🏀 עדכון מעקבדיה - ${getDateString()}"
        - Focus on the most recent game (check if it was played today or recently)
        - Include key statistics: points, rebounds, assists, shooting percentages
        - Mention the opponent team, final score, and game outcome (win/loss)
        - If there was a game today, provide detailed analysis of his performance
        - If no game today, summarize his recent form from the last few games
        - Add context about his role and impact on the team
        - Keep it concise but informative with relevant emojis (🏀⭐💪🔥)
        - Write in Hebrew for better engagement

        Example structure:
        🏀 עדכון מעקבדיה - [תאריך]

        במשחק האחרון נגד [יריב]:
        📊 סטטיסטיקה: [נקודות] נק׳ | [ריבאונדים] ריב׳ | [אסיסטים] אס׳
        🎯 אחוזי זריקה: [FG%] מהשדה | [3P%] משלוש
        ⚡ [תוצאה סופית] - [ניצחון/הפסד]`;

    const response = await chatbotService.processMessage(prompt, MY_USER_ID);

    if (response?.message) {
      await sendShortenedMessage(bot, MY_USER_ID, response.message, { parse_mode: 'Markdown' });
    }
  } catch (err) {
    logger.error(`Failed to send makavdia update: ${err}`);
  }
}
