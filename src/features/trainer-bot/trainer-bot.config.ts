export const SMART_REMINDER_HOUR_OF_DAY = 19;
export const WEEKLY_SUMMARY_HOUR_OF_DAY = 22;

export const TRAINER_BOT_COMMANDS = {
  START: { command: '/start', description: 'Start all over' },
  STOP: { command: '/stop', description: 'Stop daily reminders' },
  EXERCISE: { command: '/exercise', description: 'Log exercise' },
  ACHIEVEMENTS: { command: '/achievements', description: 'Show Achievements' },
  CONTACT: { command: '/contact', description: 'Contact' },
};

export const BROKEN_RECORD_IMAGE_PROMPT = [
  `A highly energetic and inspiring digital artwork celebrating a fitness streak record.`,
  `A glowing number representing the new streak record (e.g., '{streak} Days!') stands bold at the center, surrounded by dynamic light rays and a powerful aura.`,
  `In the background, a silhouette of a determined athlete (or a character resembling the user’s journey) is in a victorious pose, standing on top of a mountain, in a gym, or mid-workout, symbolizing their dedication.`,
  `The scene is vibrant, colorful, and motivational, evoking a sense of achievement and relentless perseverance.`,
  `The image should feel epic, cinematic, and triumphant, with sparks, glowing embers, or energy waves surrounding the main elements.`,
].join(' ');

export const ANALYTIC_EVENT_NAMES = {
  START: 'START',
  STOP: 'STOP',
  CONTACT: 'CONTACT',
};
