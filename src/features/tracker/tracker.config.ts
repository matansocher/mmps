import { TelegramBotConfig } from '@services/telegram';

export const BOT_CONFIG: TelegramBotConfig = {
  id: 'TRACKER',
  name: 'Tracker Bot 📍',
  token: 'TRACKER_TELEGRAM_BOT_TOKEN',
  commands: {
    START: { command: '/start', description: 'התחל מהתחלה', hide: true },
  },
};

export enum BOT_ACTIONS {
  TRACK = 'track',
}

export const LOCATIONS = {
  tootie: { lat: 32.179027, lon: 34.920085, chatId: 1332013273, name: 'Toodie' },
};

export const INLINE_KEYBOARD_SEPARATOR = ' - ';
