export const BOTS = {
  WOLT: {
    name: 'Wolt Bot',
    token: process.env.WOLT_TELEGRAM_BOT_TOKEN,
  },
  VOICE_PAL: {
    name: 'Voice Pal Bot',
    token: process.env.VOICE_PAL_TELEGRAM_BOT_TOKEN,
  },
  NOTEBOOK: {
    name: 'Notebook Bot',
    token: process.env.NOTEBOOK_BOT_TOKEN,
  },
};

export const BOT_BROADCAST_ACTIONS = {
  TYPING: 'typing',
  UPLOADING_VOICE: 'upload_voice',
};