export const ANALYTIC_EVENT_NAMES = {
  START: 'START',
  STOP: 'STOP',
  SEARCH: 'SEARCH',
  CONTACT: 'CONTACT',
  TABLE: 'TABLE',
  MATCH: 'MATCH',
  ERROR: 'ERROR',
};

export const COACH_BOT_COMMANDS = {
  TABLES: { command: '/tables', description: '📊 טבלאות 📊' },
  MATCHES: { command: '/matches', description: '🎱 מחזור הבא 🎱' },
  ACTIONS: { command: '/actions', description: '⚙️ פעולות ⚙️' },
};

export enum BOT_ACTIONS {
  START = 'start',
  STOP = 'stop',
  CONTACT = 'contact',
  TABLE = 'table',
  MATCH = 'match',
}
