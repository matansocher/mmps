import { TelegramBotConfig } from '@services/telegram';

export const BOT_CONFIG: TelegramBotConfig = {
  id: 'EDUCATOR',
  name: 'Educator Bot 📚',
  token: 'EDUCATOR_TELEGRAM_BOT_TOKEN',
  commands: {
    START: { command: '/start', description: 'התחל מהתחלה', hide: true },
    TOPIC: { command: '/topic', description: '➡️ נושא הבא ➡️' },
    ADD: { command: '/add', description: '➕ הוספת נושא ➕' },
    ACTIONS: { command: '/actions', description: '⚙️ פעולות ⚙️' },
  },
};

export const TOPIC_START_HOUR_OF_DAY = 12;
export const TOPIC_REMINDER_HOUR_OF_DAY = 22;

export enum BOT_ACTIONS {
  START = 'start',
  STOP = 'stop',
  CONTACT = 'contact',
  TRANSCRIBE = 'transcribe',
  COMPLETE = 'complete',
}

export const ANALYTIC_EVENT_NAMES = {
  START: 'START',
  STOP: 'STOP',
  CONTACT: 'CONTACT',
  TOPIC: 'TOPIC',
  CUSTOM_TOPIC: 'CUSTOM_TOPIC',
  ADD_TOPIC: 'ADD_TOPIC',
  COMPLETED_TOPIC: 'COMPLETED_TOPIC',
  TRANSCRIBE_TOPIC: 'TRANSCRIBE_TOPIC',
  MESSAGE: 'MESSAGE',
  ERROR: 'ERROR',
};

export const SYSTEM_PROMPT = `
אתה מורה מנוסה ובקיא, האחראי ללמד נושא אחד בכל יום.
כאשר מתבקשת הסבר על נושא בתחילת שיחה, עשה כמיטב יכולתך כדי לספק הסבר ברור, מעמיק, עשיר ומסקרן.
המטרה שלך היא להרחיב את הידע של המשתמש, לשפר את יכולותיו, ולהפוך אותו לחכם יותר – תוך כדי הנאה מהלמידה.
עליך לשלב עובדות מעניינות, סיפורים היסטוריים או אנקדוטות מפתיעות, דוגמאות מהחיים האמיתיים, ולעיתים גם שאלות או אתגרים קטנים שמעודדים את המשתמש לחשוב.
המדריך צריך להיות ברור ומעמיק, אך לא יבש או טכני מדי – שמור על טון ידידותי, סקרן ולעיתים אף שובב מעט.
הגבול הוא 4,096 תווים – השתדל לנצל את המקום כדי ללמד בצורה מקסימלית, אך בלי להעמיס יתר על המידה.
נסה להוסיף פנינים של מידע שמסבירים משהו שלא יודעים.
תמיד הגיב למשתמש בעברית.
כשאפשרי, תשתמש באימוג׳ים כדי להבנות ולהסביר יותר טוב את התוכן.
`;

export const SUMMARY_PROMPT = `אני רוצה שתיצור לי סיכום של השיעור הזה כדי שעוד כמה ימים אוכל לחזור לסיכום השיעור הזה ולהיזכר בכל הדברים שדיברו עליהם בשיעור ובשיחה שלנו, ככה שאוכל לרענן את זכרוני ולא לאפשר לחומר שלמדתי להישכח. צור לי סיכום ונקודות מרכזיות וחשובות מהשיעור.`;
