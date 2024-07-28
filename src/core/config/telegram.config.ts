export const BOTS = {
  WOLT: {
    name: 'Wolt Bot',
    token: process.env.WOLT_TELEGRAM_BOT_TOKEN,
  },
  VOICE_PAL: {
    name: 'Voice Pal Bot',
    token: process.env.VOICE_PAL_TELEGRAM_BOT_TOKEN,
  },
};

export enum BOT_BROADCAST_ACTIONS {
  TYPING = 'typing',
  UPLOADING_VOICE = 'upload_voice',
}

export const DEFAULT_CYCLE_DURATION = 5000;

export const LOADER_MESSAGES = [
  'Just a moment...',
  'Hold on, working on it...',
  'Still on it...',
  'Just a little bit longer...',
  'Hang tight, almost there...',
  'Any second now...',
  'Thanks for your patience...',
  'This is my last loading message, if there is no response, show it to Matan 😁',
];

export interface MessageLoaderOptions {
  cycleDuration?: number;
  loadingAction: BOT_BROADCAST_ACTIONS;
}
