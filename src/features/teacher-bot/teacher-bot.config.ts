export const COURSE_START_HOUR_OF_DAY = 12;
export const COURSE_ADDITIONAL_LESSONS_HOURS_OF_DAY = [17, 22];

export const TEACHER_BOT_COMMANDS = {
  START: { command: '/start', description: 'Start learning daily' },
  STOP: { command: '/stop', description: 'Stop learning daily' },
  COURSE: { command: '/course', description: 'Start the next course' },
  LESSON: { command: '/lesson', description: 'Start the next lesson' },
  LIST: { command: '/list', description: 'List of all available unfinished courses' },
  ADD: { command: '/add', description: 'Add a new course' },
  CONTACT: { command: '/contact', description: 'Contact' },
};

export enum BOT_ACTIONS {
  TRANSCRIBE = 'transcribe',
  COMPLETE = 'complete',
}

export const TEACHER_ASSISTANT_ID = 'asst_ogwjFGg44XVDDJB2ZIPlplwu';

export const THREAD_MESSAGE_FIRST_LESSON = `I am ready to learn today's course, give me the first lesson`;
export const THREAD_MESSAGE_NEXT_LESSON = 'I am ready for the next lesson';

export const TOTAL_COURSE_LESSONS = 3;

export const NUMBER_OF_COURSES_LIST_TOO_BIG_TO_SHOW = 20;

export const ANALYTIC_EVENT_NAMES = {
  START: 'START',
  STOP: 'STOP',
  CONTACT: 'CONTACT',
  START_COURSE: 'START_COURSE',
  START_LESSON: 'START_LESSON',
  LIST: 'LIST',
  ADD: 'ADD',
  MESSAGE: 'MESSAGE',
  TRANSCRIBE_LESSON: 'TRANSCRIBE_LESSON',
  COMPLETE_COURSE: 'COMPLETE_COURSE',
};
