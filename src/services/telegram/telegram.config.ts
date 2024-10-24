import { env } from 'node:process';

export const BOTS = {
  WOLT: {
    name: 'Wolt Bot',
    token: env.WOLT_TELEGRAM_BOT_TOKEN,
  },
  TABIT: {
    name: 'Tabit Bot',
    token: env.TABIT_TELEGRAM_BOT_TOKEN,
  },
  ONTOPO: {
    name: 'Ontopo Bot',
    token: env.ONTOPO_TELEGRAM_BOT_TOKEN,
  },
  VOICE_PAL: {
    name: 'Voice Pal Bot',
    token: env.VOICE_PAL_TELEGRAM_BOT_TOKEN,
  },
  NEWS: {
    name: 'News Bot',
    token: env.NEWS_TELEGRAM_BOT_TOKEN,
  },
  NOTIFIER: {
    name: 'Notifier Bot',
    token: env.NOTIFIER_TELEGRAM_BOT_TOKEN,
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
