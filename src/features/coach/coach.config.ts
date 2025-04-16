export const ANALYTIC_EVENT_NAMES = {
  START: 'START',
  STOP: 'STOP',
  SEARCH: 'SEARCH',
  CONTACT: 'CONTACT',
  ERROR: 'ERROR',
};

export const COACH_BOT_COMMANDS = {
  TABLES: { command: '/tables', description: '📊 טבלאות 📊' },
  ACTIONS: { command: '/actions', description: '⚙️ פעולות ⚙️' },
};

export enum BOT_ACTIONS {
  START = 'start',
  STOP = 'stop',
  CONTACT = 'contact',
  TABLE = 'table',
}
