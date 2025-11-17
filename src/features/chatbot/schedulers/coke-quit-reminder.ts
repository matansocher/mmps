import type TelegramBot from 'node-telegram-bot-api';
import { Logger } from '@nestjs/common';
import { MY_USER_ID } from '@core/config';
import { getOrCreateTracker, getStats } from '@shared/coke-quit';
import type { ChatbotService } from '../chatbot.service';

const logger = new Logger('CokeQuitReminderScheduler');

export async function cokeQuitReminder(bot: TelegramBot, chatbotService: ChatbotService): Promise<void> {
  try {
    await getOrCreateTracker(MY_USER_ID);
    const stats = await getStats(MY_USER_ID);

    if (!stats) {
      logger.error('Failed to get coke-quit stats');
      return;
    }

    const prompt = `תשלח לי הודעת תזכורת קצרה בעברית שאני לא אשתה קוקה-קולה הערב.

הסטריק הנוכחי שלי: ${stats.currentStreak} ימים בלי קולה
הסטריק הארוך ביותר שלי: ${stats.longestStreak} ימים

דרישות:
- כתוב בעברית בלבד
- הודעה קצרה (1-2 משפטים)
- השתמש בסגנון אחד מהבאים (בחר אחד באקראי):
  * תומך ומעודד 💙
  * תקיף ומוטיבציוני 🔥
  * הומוריסטי וקליל 😎
- כלול את מספר הימים בסטריק בהודעה
- אל תוסיף הסבר או טקסט נוסף, רק את ההודעה עצמה
- השתמש באימוג'י אחד או שניים לעניין`;

    const response = await chatbotService.processMessage(prompt, MY_USER_ID);

    if (response?.message) {
      await bot.sendMessage(MY_USER_ID, response.message);
      logger.log(`Sent coke-quit reminder (Day ${stats.currentStreak})`);
    }
  } catch (err) {
    logger.error(`Failed to send coke-quit reminder: ${err}`);
  }
}
