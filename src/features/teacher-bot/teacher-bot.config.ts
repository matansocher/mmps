export const INITIAL_BOT_RESPONSE = [
  `Hey There 👋`,
  `I am here to teach you all you need about any subject you want.`,
  `I will send you daily lessons of stuff I collect on the internet and summarize it for you in a great way that you can learn from. 😁`,
  `You can always add a course topic by sending me the topic on this format - /add <course topic>, example: /add JavaScript Heap`,
].join('\n\n');

export const COURSE_START_HOUR_OF_DAY = 12;
export const COURSE_ADDITIONAL_LESSONS_HOURS_OF_DAY = [17, 22];

export const TEACHER_BOT_OPTIONS = {
  START: '/start',
  COURSE: '/course',
  LESSON: '/lesson',
  LIST: '/list',
  HISTORY: '/history',
  ADD: '/add',
  REMOVE: '/remove',
};

export const TEACHER_ASSISTANT_ID = 'asst_ogwjFGg44XVDDJB2ZIPlplwu';

export const THREAD_MESSAGE_FIRST_LESSON = `I am ready to learn today's course, give me the first lesson`;
export const THREAD_MESSAGE_NEXT_LESSON = 'I am ready for the next lesson';

export const TOTAL_COURSE_LESSONS = 3;

export const NUMBER_OF_COURSES_LIST_TOO_BIG_TO_SHOW = 20;
export const NUMBER_OF_COURSES_HISTORY_TOO_BIG_TO_SHOW = 50;
