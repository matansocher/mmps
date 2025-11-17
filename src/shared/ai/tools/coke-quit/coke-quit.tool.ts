import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { MY_USER_ID } from '@core/config';
import { generateImage } from '@services/xai';
import { getOrCreateTracker, getStats, recordSlip } from '@shared/coke-quit';

const harshResponses = [
  'ברצינות? הגעת ל-{STREAK} ימים וזרקת הכל לפח בשביל מים מוגזים עם סוכר? פתטי. חזרנו ליום 0. בוא נראה אם יש לך קצת שליטה עצמית הפעם.',
  'וואו. פשוט... וואו. {STREAK} ימים במזבלה כי לא יכולת להתאפק מקולה. השיניים, השינה, הבריאות שלך - כולם צוחקים עליך עכשיו. יום 0. שוב.',
  'אני לא כועס, אני פשוט מאוכזב. לא, רגע, אני כן כועס. {STREAK} ימים והתקפלת כמו אוהל זול. חזרה לנקודת ההתחלה, אלוף. 🤡',
  'מזל טוב! שיחקת את עצמך. {STREAK} ימים של התקדמות נמחקו בשביל 5 דקות של סוכר. מקווה שזה היה שווה את זה. איפוס סטריק. נסה לא להיות כל כך חלש הפעם.',
  'תן לי לנחש - "רק לגימה אחת"? כן, זה עבד מעולה. יום 0. הסטריק הארוך ביותר שלך עדיין {LONGEST} ימים - שאתה כנראה לעולם לא תנצח בקצב הזה.',
  'אתה יודע מה? קוקה-קולה מנצחת. אתה מפסיד. {STREAK} ימים נעלמו. אתה בכלל רוצה להפסיק או שאתה רק מבזבז לי זמן פה?',
  'יום 0. אפס. אתה יודע כמה ימי התקדמות בדיוק מחקת? {STREAK}. בשביל קולה. בשלב הזה, למה בכלל לנסות? (אבל ברצינות, תתאגד.)',
  'שלחתי לך תזכורות ואתה עדיין שתית את זה. מה קרה? עמוד השדרה שלך נמס בסוכר? חזרה ליום 0, חלש.',
  'חדשות אחרונות: אדם מקומי עם כוח רצון של מפית רטובה. סטריק של {STREAK} ימים נרצח על ידי משקה מוגז. עוד בחדשות ה-11. (סטריק: יום 0)',
  'הישג נפתח: "מאסטר חבלה עצמית" 🏆 הרסת סטריק של {STREAK} ימים. המנהלים של קוקה-קולה חוגגים. אתה בחזרה ליום 0, מזל טוב.',
  'שגיאה 404: שליטה עצמית לא נמצאה. {STREAK} ימים נמחקו. Streak.exe הפסיק לעבוד. מאתחל מיום 0... אם אתה מסוגל לזה.',
  'הסטריק של {STREAK} ימים שלך התקשר - הוא מגיש צו ריחוק נגדך. יום 0. נסה יותר חזק, או אל תנסה. אני לא אמא שלך.',
  'תאר לעצמך להפסיד למשקה קל. לא יכול להיות אני. אה חכה, זה אתה. יום 0 שוב. ה"סטריק הארוך ביותר" שלך הוא {LONGEST} ימים - אנדרטה לשיא הביצועים שלך לפני האסון הזה.',
];

const schema = z.object({
  action: z.enum(['report_slip', 'get_streak', 'initialize']).describe('The action to perform'),
});

async function runner({ action }: z.infer<typeof schema>) {
  try {
    const chatId = MY_USER_ID;

    switch (action) {
      case 'initialize': {
        await getOrCreateTracker(chatId);
        return JSON.stringify({
          success: true,
          message: 'מעקב נטול קולה הופעל. אני אתקשר איתך ב-12:30 בצהריים, 10 בערב, ו-11:30 בלילה כל יום. אל תאכזב אותי. 💪',
        });
      }

      case 'report_slip': {
        const stats = await getStats(chatId);
        if (!stats) {
          return JSON.stringify({ error: 'Tracker not found. Initialize first.' });
        }

        const currentStreak = stats.currentStreak;
        const longestStreak = stats.longestStreak;

        await recordSlip(chatId);

        const randomResponse = harshResponses[Math.floor(Math.random() * harshResponses.length)];
        const harshMessage = randomResponse.replace(/{STREAK}/g, currentStreak.toString()).replace(/{LONGEST}/g, longestStreak.toString());

        const uglyCokePrompt =
          'A disgusting, rotten Coca-Cola can. The can is rusty, dented, covered in mold and grime. The logo is faded and peeling off. The can is leaking brown sticky liquid. The metal is corroded. Flies buzzing around it. Dark, gritty, unappetizing atmosphere. Make it look as repulsive and unappealing as possible.';

        const imageUrl = await generateImage(uglyCokePrompt);

        return JSON.stringify({
          success: true,
          message: harshMessage,
          imageUrl,
          stats: {
            currentStreak: 0,
            longestStreak,
            slipCount: stats.slipCount + 1,
          },
        });
      }

      case 'get_streak': {
        const stats = await getStats(chatId);
        if (!stats) {
          return JSON.stringify({ error: 'מעקב לא נמצא. צריך לאתחל קודם.' });
        }

        return JSON.stringify({
          success: true,
          currentStreak: stats.currentStreak,
          longestStreak: stats.longestStreak,
          totalCokeFreeNights: stats.totalCokeFreeNights,
          slipCount: stats.slipCount,
          message: `אתה ביום ${stats.currentStreak} בלי קולה! תמשיך כך! 💪 (סטריק הכי ארוך: ${stats.longestStreak} ימים)`,
        });
      }

      default:
        return JSON.stringify({ error: 'Invalid action' });
    }
  } catch (err) {
    return JSON.stringify({ error: `Failed to perform coke-quit action: ${err.message}` });
  }
}

export const cokeQuitTool = tool(runner, {
  name: 'coke_quit_tracker',
  description: 'Track the users journey to quit drinking Coca-Cola. Detect when user mentions drinking Coke and respond harshly. Check streak progress.',
  schema,
});
