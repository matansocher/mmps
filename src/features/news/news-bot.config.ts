export const INITIAL_BOT_RESPONSE = [`שלום {firstName}!`, `אני בוט שיכול לעזור לך לקבל סיכום של כל החדשות בכל יום`, `אפשר להציץ באפשרויות המובנות שלי לפרטים נוספים 😁`].join('\n\n');

export const SUBSCRIBE_MESSAGE = 'סבבה, אני אשלח לך אחת ליום סיכום של כל מה שקרה באותו היום, מקווה שיהיה מספיק מעניין';
export const UNSUBSCRIBE_MESSAGE = 'בסדר, אני אפסיק לשלוח את העדכונים היומיים';

export const GENERAL_ERROR_MESSAGE = 'נראה שמשהו בלתי צפוי קרה, אנא נסה שוב מאוחר יותר';

export const ANALYTIC_EVENT_NAMES = {
  START: 'START',
  SHOW: 'SHOW',
  SEARCH: 'SEARCH',
  SUBSCRIBE: 'SUBSCRIBE',
  UNSUBSCRIBE: 'UNSUBSCRIBE',
  SUBSCRIPTION_FULFILLED: 'SUBSCRIPTION_FULFILLED',
  DAILY_SUMMARY: 'DAILY_SUMMARY',
  ERROR: 'ERROR',
};
