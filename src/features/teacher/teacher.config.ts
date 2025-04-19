import { TelegramBotConfig } from '@services/telegram';

export const BOT_CONFIG: TelegramBotConfig = {
  id: 'PROGRAMMING_TEACHER',
  name: 'Programming Teacher Bot 👨‍🏫',
  token: 'PROGRAMMING_TEACHER_TELEGRAM_BOT_TOKEN',
  commands: {
    COURSE: { command: '/course', description: '➡️ Start the next course ➡️' },
    ADD: { command: '/add', description: '➕ Add a new course ➕' },
    ACTIONS: { command: '/actions', description: '⚙️ Actions ⚙️' },
  },
};

export const COURSE_START_HOUR_OF_DAY = 12;
export const COURSE_ADDITIONAL_LESSONS_HOURS_OF_DAY = [17, 22];

export enum BOT_ACTIONS {
  START = 'start',
  STOP = 'stop',
  CONTACT = 'contact',
  TRANSCRIBE = 'transcribe',
  NEXT_LESSON = 'next_lesson',
  COMPLETE = 'complete',
}

export const TEACHER_ASSISTANT_ID = 'asst_ogwjFGg44XVDDJB2ZIPlplwu';

export const THREAD_MESSAGE_FIRST_LESSON = `I am ready to learn today's course, give me the first lesson`;
export const THREAD_MESSAGE_NEXT_LESSON = 'I am ready for the next lesson';

export const TOTAL_COURSE_LESSONS = 3;

export const ANALYTIC_EVENT_NAMES = {
  START: 'START',
  STOP: 'STOP',
  CONTACT: 'CONTACT',
  START_COURSE: 'START_COURSE',
  NEXT_LESSON: 'NEXT_LESSON',
  ADD: 'ADD',
  MESSAGE: 'MESSAGE',
  TRANSCRIBE_LESSON: 'TRANSCRIBE_LESSON',
  COMPLETE_COURSE: 'COMPLETE_COURSE',
  ERROR: 'ERROR',
};
