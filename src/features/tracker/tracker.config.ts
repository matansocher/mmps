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
  toodie: { lat: 32.179027, lon: 34.920085, chatId: 1332013273, name: 'Toodie', number: '+972546602785' },
  work: { lat: 32.1740445, lon: 34.8881472, chatId: 862305226, name: 'Matan', number: '+972545429402' },
};

export const INLINE_KEYBOARD_SEPARATOR = ' - ';

export const NOTIFY_ARRIVAL_DISTANCE = 200;
