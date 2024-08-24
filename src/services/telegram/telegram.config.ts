export interface IBotOptions {
  name: string;
  token: string;
}

export const BOTS = {
  WOLT: {
    name: 'Wolt Bot',
    token: process.env.WOLT_TELEGRAM_BOT_TOKEN,
  },
  VOICE_PAL: {
    name: 'Voice Pal Bot',
    token: process.env.VOICE_PAL_TELEGRAM_BOT_TOKEN,
  },
  STOCK_BUDDY: {
    name: 'Stock Buddy Bot',
    token: process.env.STOCK_BUDDY_TELEGRAM_BOT_TOKEN,
  },
  NOTIFIER: {
    name: 'Notifier Bot',
    token: process.env.NOTIFIER_TELEGRAM_BOT_TOKEN,
  },
};

export enum BOT_BROADCAST_ACTIONS {
  TYPING = 'typing',
  UPLOADING_VOICE = 'upload_voice',
}

export enum POSSIBLE_INPUTS {
  TEXT = 'text',
  AUDIO = 'audio',
  VIDEO = 'video',
  PHOTO = 'photo',
  FILE = 'file',
}
