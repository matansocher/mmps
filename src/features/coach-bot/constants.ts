export const INITIAL_BOT_RESPONSE = [
  `שלום 👋`,
  `אני פה כדי לתת תוצאות של משחקי ספורט`,
  `כדי לראות תוצאות של משחקים מהיום נכון לעכשיו, אפשר פשוט לשלוח לי הודעה, כל הודעה`,
  `כדי לראות תוצאות מיום אחר, אפשר לשלוח לי את התאריך שרוצים בפורמט (2025-03-17 📅) הזה ואני אשלח תוצאות רלוונטיות לאותו יום`,
].join('\n\n');

export const GENERAL_ERROR_RESPONSE = 'וואלה מצטער לא יודע מה קרה, אבל קרתה לי בעיה. אפשר לנסות קצת יותר מאוחר 🙁';

export const ANALYTIC_EVENT_STATES = {
  START: 'START',
  SEARCH: 'SEARCH',
  ERROR: 'ERROR',
  SUBSCRIBE: 'SUBSCRIBE',
  UNSUBSCRIBE: 'UNSUBSCRIBE',
  SUCCESS: 'SUCCESS',
};

export const COACH_BOT_OPTIONS = {
  START: '/start',
  SUBSCRIBE: '/subscribe',
  UNSUBSCRIBE: '/unsubscribe',
};
