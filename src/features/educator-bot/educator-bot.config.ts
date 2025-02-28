export const TOPIC_START_HOURS_OF_DAY = [12, 18, 22];
export const IDLE_DAYS_REMINDER = 3;

export const EDUCATOR_BOT_COMMANDS = {
  START: { command: '/start', description: 'רוצה להתחיל ללמוד' },
  STOP: { command: '/stop', description: 'רוצה להפסיק ללמוד' },
  TOPIC: { command: '/topic', description: 'נושא הבא' },
  CUSTOM: { command: '/custom', description: 'נושא ספציפי' },
  ADD: { command: '/add', description: 'הוספת נושא' },
};

export enum BOT_ACTIONS {
  COMPLETE = 'complete',
}

export const EDUCATOR_ASSISTANT_ID = 'asst_2uMH7TYQkUwbwxWlp5f7L6NY';
