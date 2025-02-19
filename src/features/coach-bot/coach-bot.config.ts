import { BotCommand } from 'node-telegram-bot-api';

export const INITIAL_BOT_RESPONSE = [
  `שלום 👋`,
  `אני פה כדי לתת תוצאות של משחקי ספורט`,
  `כדי לראות תוצאות של משחקים מהיום נכון לעכשיו, אפשר פשוט לשלוח לי הודעה, כל הודעה`,
  `כדי לראות תוצאות מיום אחר, אפשר לשלוח לי את התאריך שרוצים בפורמט (2025-03-17 📅) הזה ואני אשלח תוצאות רלוונטיות לאותו יום`,
].join('\n\n');

export const CUSTOM_ERROR_MESSAGE = 'וואלה מצטער לא יודע מה קרה, אבל קרתה לי בעיה. אפשר לנסות קצת יותר מאוחר 🙁';

export const ANALYTIC_EVENT_STATES = {
  START: 'START',
  SEARCH: 'SEARCH',
  ERROR: 'ERROR',
  SUBSCRIBE: 'SUBSCRIBE',
  UNSUBSCRIBE: 'UNSUBSCRIBE',
  SUCCESS: 'SUCCESS',
};

export const COACH_BOT_COMMANDS = {
  START: { command: '/start', description: 'התחלה' },
  SUBSCRIBE: { command: '/subscribe', description: 'רוצה לקבל עדכונים יומיים' },
  UNSUBSCRIBE: { command: '/unsubscribe', description: 'רוצה להפסיק לקבל עדכונים יומיים' },
};
