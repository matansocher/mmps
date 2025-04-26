import { TelegramBotConfig } from '@services/telegram';

export const BOT_CONFIG: TelegramBotConfig = {
  id: 'EDUCATOR',
  name: 'Educator Bot 📚',
  token: 'EDUCATOR_TELEGRAM_BOT_TOKEN',
  commands: {
    START: { command: '/start', description: 'התחל מהתחלה', hide: true },
    TOPIC: { command: '/topic', description: '➡️ נושא הבא ➡️' },
    ADD: { command: '/add', description: '➕ הוספת נושא ➕' },
    ACTIONS: { command: '/actions', description: '⚙️ פעולות ⚙️' },
  },
};

export const TOPIC_START_HOURS_OF_DAY = [12, 18, 22];

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
