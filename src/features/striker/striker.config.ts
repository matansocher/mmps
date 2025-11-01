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
};
