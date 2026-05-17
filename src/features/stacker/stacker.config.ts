import type { TelegramBotConfig } from '@services/telegram';

export const BOT_CONFIG: TelegramBotConfig = {
  id: 'STACKER',
  name: 'Stacker 🧠',
  token: 'STACKER_TELEGRAM_BOT_TOKEN',
  commands: {
    START: { command: '/start', description: 'Start', hide: true },
    PLAY: { command: '/play', description: '🎯 Play Stacker' },
  },
};
