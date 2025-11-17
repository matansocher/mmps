import type TelegramBot from 'node-telegram-bot-api';
import { Logger } from '@nestjs/common';
import { MY_USER_ID } from '@core/config';
import { getStats, getTracker } from '@shared/coke-quit';
import type { ChatbotService } from '../chatbot.service';

const logger = new Logger('CokeQuitWeeklySummaryScheduler');

export async function cokeQuitWeeklySummary(bot: TelegramBot, chatbotService: ChatbotService): Promise<void> {
  try {
    const tracker = await getTracker(MY_USER_ID);
    const stats = await getStats(MY_USER_ID);

    if (!tracker || !stats) {
      logger.error('Failed to get coke-quit tracker or stats');
      return;
    }

    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const slipsThisWeek = tracker.slips.filter((slip) => slip.date >= oneWeekAgo).length;
    const cokeFreeNightsThisWeek = 7 - slipsThisWeek;

    const prompt = `תיצור עבורי דו"ח שבועי על ההתקדמות שלי בהפסקת שתיית קוקה-קולה, בעברית.

הנתונים השבוע:
- לילות נטולי קולה השבוע: ${cokeFreeNightsThisWeek}/7
- סטריק נוכחי: ${stats.currentStreak} ימים
- הסטריק הארוך ביותר אי פעם: ${stats.longestStreak} ימים

דרישות:
- כתוב בעברית בלבד
- התחל עם "📊 דו״ח שבועי - השבוע הושלם"
- כלול את כל 3 הנתונים
- הוסף משפט סיכום בהתאם לביצועים:
  * אם 7/7 - חגיגי ומרשים 🔥
  * אם 4-6/7 - מעורב, עידוד לעשות יותר טוב 💪
  * אם 0-3/7 - תקיף ומאכזב 🤦
- השתמש באימוג'י`;

    const response = await chatbotService.processMessage(prompt, MY_USER_ID);

    if (response?.message) {
      await bot.sendMessage(MY_USER_ID, response.message);
      logger.log(`Sent weekly coke-quit summary`);
    }
  } catch (err) {
    logger.error(`Failed to send weekly coke-quit summary: ${err}`);
  }
}
