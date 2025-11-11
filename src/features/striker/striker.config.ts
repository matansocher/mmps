import { TelegramBotConfig } from '@services/telegram';

export const BOT_CONFIG: TelegramBotConfig = {
  id: 'STRIKER',
  name: 'Striker ⚽️',
  token: 'STRIKER_BOT_TOKEN',
  commands: {
    START: { command: '/start', description: 'Start', hide: true },
    PLAY: { command: '/play', description: 'New game' },
    CLUE: { command: '/clue', description: 'Next clue' },
    GIVEUP: { command: '/giveup', description: 'Give up' },
    STATS: { command: '/stats', description: 'Game statistics' },
    ACTIONS: { command: '/actions', description: '⚙️ Actions ⚙️' },
    HELP: { command: '/help', description: 'Get help' },
  },
};

export const ANALYTIC_EVENT_NAMES = {
  START: 'start',
  PLAY: 'play',
  CLUE: 'clue',
  GUESS: 'guess',
  GIVE_UP: 'give_up',
  STATS: 'stats',
  DAILY_GAME: 'daily_game',
  SUBSCRIBE: 'subscribe',
  UNSUBSCRIBE: 'unsubscribe',
  DIFFICULTY_CHANGED: 'difficulty_changed',
  ERROR: 'error',
};

export enum BOT_ACTIONS {
  SUBSCRIBE = 'subscribe',
  UNSUBSCRIBE = 'unsubscribe',
  DIFFICULTY = 'difficulty',
}

export const DIFFICULTY_LABELS = {
  1: '⚽️ Easy',
  2: '🔥 Medium',
  3: '🏆 Hard',
};

export const INLINE_KEYBOARD_SEPARATOR = '|';

export const FUZZY_MATCH_THRESHOLD = 65;
