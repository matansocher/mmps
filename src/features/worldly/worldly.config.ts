import { MMPS_BASE_URL } from '@core/config';
import type { TelegramBotConfig } from '@services/telegram';
import type { WorldlyLanguage } from '@shared/worldly';
import { worldlyText } from './language';

export const GLOBE_APP_PATH = '/earth';
export const GLOBE_APP_URL = `${MMPS_BASE_URL}${GLOBE_APP_PATH}`;

export const BOT_CONFIG: TelegramBotConfig = {
  id: 'WORLDLY',
  name: 'Worldly Bot 🌍',
  token: 'WORLDLY_TELEGRAM_BOT_TOKEN',
  commands: {
    START: { command: '/start', description: worldlyText().commands.START, hide: true },
    FIRE_MODE: { command: '/fire_mode', description: worldlyText().commands.FIRE_MODE },
    RANDOM: { command: '/random', description: worldlyText().commands.RANDOM },
    MAP: { command: '/map', description: worldlyText().commands.MAP },
    FLAG: { command: '/flag', description: worldlyText().commands.FLAG },
    CAPITAL: { command: '/capital', description: worldlyText().commands.CAPITAL },
    US_MAP: { command: '/usmap', description: worldlyText().commands.US_MAP },
    GLOBE: { command: '/globe', description: worldlyText().commands.GLOBE },
    LOGIC: { command: '/logic', description: worldlyText().commands.LOGIC },
    ACTIONS: { command: '/actions', description: worldlyText().commands.ACTIONS },
  },
};

export const ANALYTIC_EVENT_NAMES = {
  START: 'START',
  STOP: 'STOP',
  FIRE: 'FIRE',
  RANDOM: 'RANDOM',
  MAP: 'MAP',
  US_MAP: 'US_MAP',
  FLAG: 'FLAG',
  CAPITAL: 'CAPITAL',
  GLOBE: 'GLOBE',
  GLOBE_OPENED: 'GLOBE_OPENED',
  GLOBE_ROUND_STARTED: 'GLOBE_ROUND_STARTED',
  GLOBE_ROUND_FINISHED: 'GLOBE_ROUND_FINISHED',
  LOGIC: 'LOGIC',
  LOGIC_DAILY: 'LOGIC_DAILY',
  ANSWERED: 'ANSWERED',
  CONTACT: 'CONTACT',
  STATISTICS: 'STATISTICS',
  ERROR: 'ERROR',
};

export enum BOT_ACTIONS {
  START = 'start',
  STOP = 'stop',
  CONTACT = 'contact',
  STATISTICS = 'statistics',
  LANGUAGE = 'language',
  SET_LANGUAGE = 'set_language',
  ACTIONS = 'actions',
  FIRE = 'fire',
  RANDOM = 'rand',
  MAP = 'm',
  US_MAP = 'us_m',
  FLAG = 'f',
  CAPITAL = 'c',
}

export const INLINE_KEYBOARD_SEPARATOR = '|';

export function getWorldlyCommands(language: WorldlyLanguage = 'en') {
  return Object.entries(BOT_CONFIG.commands)
    .filter(([, config]) => !config.hide)
    .map(([key, config]) => ({ command: config.command.replace('/', ''), description: worldlyText(language).commands[key as keyof ReturnType<typeof worldlyText>['commands']] }));
}
