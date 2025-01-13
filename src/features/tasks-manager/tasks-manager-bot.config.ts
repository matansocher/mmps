export const INITIAL_BOT_RESPONSE = [
  `Hey There 👋`,
  `I am here to help you manage your tasks. Tell me what you want to be reminded of, and when, and I will notify you 😁`,
].join('\n\n');

export const INVALID_INPUT = `Your input is invalid, please follow the format: "<intervalAmount><intervalUnits> - <title>" 🛑`;

export const TASKS_MANAGER_BOT_OPTIONS = {
  START: '/start',
  MANAGE: '/manage',
};

export const ANALYTIC_EVENS = {
  START: 'start',
  ERROR: 'error',
  ADD_TASK: 'add_task',
  REMINDED: 'reminded',
};

export enum BOT_ACTIONS {
  TASK_COMPLETED = 'task_completed',
}

export const ACTION_VALUE_SEPARATOR = ` - `;

export const QUIET_HOURS = { start: 23, end: 7 };
