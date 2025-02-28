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
  CONTACT: { command: '/contact', description: 'צור קשר' },
};
