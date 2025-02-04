import { BotCommand } from 'node-telegram-bot-api';

export const INITIAL_BOT_RESPONSE = [`Hey There 👋`, `I am here to help you stay motivated with your exercises 🏋️‍♂️`].join('\n\n');

export const SMART_REMINDER_HOUR_OF_DAY = 19;

export const TRAINER_BOT_COMMANDS: Record<string, BotCommand> = {
  START: { command: '/start', description: 'Start all over' },
  EXERCISE: { command: '/exercise', description: 'Log exercise' },
  HISTORY: { command: '/history', description: 'Show exercises history' },
  ACHIEVEMENTS: { command: '/achievements', description: 'Show Achievements' },
};

export const MAX_EXERCISES_HISTORY_TO_SHOW = 14;
