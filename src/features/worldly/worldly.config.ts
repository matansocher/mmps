export const WORLDLY_BOT_COMMANDS = {
  RANDOM: { command: '/random', description: '🌎 Random game 🌎' },
  MAP: { command: '/map', description: '🗺️ Map 🗺️' },
  FLAG: { command: '/flag', description: '🏁 Flag 🏁' },
  CAPITAL: { command: '/capital', description: '🏛️ Capital City 🏛️' },
  US_MAP: { command: '/usmap', description: '🇺🇸 USA Map 🇺🇸' },
  ACTIONS: { command: '/actions', description: '⚙️ Actions ⚙️' },
};

export const ANALYTIC_EVENT_NAMES = {
  START: 'START',
  STOP: 'STOP',
  RANDOM: 'RANDOM',
  MAP: 'MAP',
  US_MAP: 'US_MAP',
  FLAG: 'FLAG',
  CAPITAL: 'CAPITAL',
  ANSWERED: 'ANSWERED',
  CONTACT: 'CONTACT',
  ERROR: 'ERROR',
};

export enum BOT_ACTIONS {
  START = 'start',
  STOP = 'stop',
  CONTACT = 'contact',
  MAP = 'm',
  US_MAP = 'us_m',
  FLAG = 'f',
  CAPITAL = 'c',
}
