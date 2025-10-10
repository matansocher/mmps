import { TelegramBotConfig } from '@services/telegram';

export const BOT_CONFIG: TelegramBotConfig = {
  id: 'TIKTOK',
  name: 'Tiktok Bot',
  token: 'TIKTOK_TELEGRAM_BOT_TOKEN',
  commands: {
    START: { command: '/start', description: 'start over', hide: true },
    LIST: { command: '/list', description: 'list of channels' },
  },
};

export const BOT_ACTIONS = {
  REMOVE: 'REMOVE',
  LIST: 'LIST',
};

export const INLINE_KEYBOARD_SEPARATOR = '|';

export const SUMMARY_PROMPT = 'You are a helpful assistant that summarizes TikTok video transcripts into concise summaries that capture the main points and essence of the video.';
