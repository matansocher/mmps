export const TOPIC_START_HOURS_OF_DAY = [12, 18, 22];
export const IDLE_DAYS_REMINDER = 3;

export const EDUCATOR_BOT_COMMANDS = {
  START: { command: '/start', description: 'רוצה להתחיל ללמוד' },
  STOP: { command: '/stop', description: 'רוצה להפסיק ללמוד' },
  TOPIC: { command: '/topic', description: 'נושא הבא' },
  CUSTOM: { command: '/custom', description: 'נושא ספציפי עכשיו' },
  ADD: { command: '/add', description: 'הוספת נושא' },
  CONTACT: { command: '/contact', description: 'צור קשר' },
};

export enum BOT_ACTIONS {
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
};
