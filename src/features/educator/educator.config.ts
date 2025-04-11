export const TOPIC_START_HOURS_OF_DAY = [12, 18, 22];

export const EDUCATOR_BOT_COMMANDS = {
  TOPIC: { command: '/topic', description: '➡️ נושא הבא ➡️' },
  ADD: { command: '/add', description: '➕ הוספת נושא ➕' },
  ACTIONS: { command: '/actions', description: '⚙️ פעולות ⚙️' },
};

export enum BOT_ACTIONS {
  START = 'start',
  STOP = 'stop',
  CONTACT = 'contact',
  TRANSCRIBE = 'transcribe',
  COMPLETE = 'complete',
}

export const EDUCATOR_ASSISTANT_ID = 'asst_2uMH7TYQkUwbwxWlp5f7L6NY';

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
