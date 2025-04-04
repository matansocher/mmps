export const WORLDLY_BOT_COMMANDS = {
  RANDOM: { command: '/random', description: 'Random game' },
  MAP: { command: '/map', description: 'Guess the country by map game' },
  FLAG: { command: '/flag', description: 'Guess the country by flag game' },
  CAPITAL: { command: '/capital', description: 'Guess the capital city of a country game' },
  START: { command: '/start', description: 'want to get daily geography games' },
  STOP: { command: '/stop', description: 'want to stop getting daily geography games' },
  CONTACT: { command: '/contact', description: 'contact' },
};

export const ANALYTIC_EVENT_NAMES = {
  START: 'START',
  STOP: 'STOP',
  RANDOM: 'RANDOM',
  MAP: 'MAP',
  FLAG: 'FLAG',
  CAPITAL: 'CAPITAL',
  ANSWERED: 'ANSWERED',
  CONTACT: 'CONTACT',
  ERROR: 'ERROR',
};

export enum BOT_ACTIONS {
  MAP = 'm',
  FLAG = 'f',
  CAPITAL = 'c',
}
