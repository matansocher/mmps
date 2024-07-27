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

export const TELEGRAM_BOT_WOLT_INJECTOR = 'TELEGRAM_BOT_WOLT_INJECTOR';
export const TELEGRAM_BOT_VOICE_PAL_INJECTOR = 'TELEGRAM_BOT_VOICE_PAL_INJECTOR';

export enum BOT_BROADCAST_ACTIONS {
  TYPING = 'typing',
  UPLOADING_VOICE = 'upload_voice',
}
