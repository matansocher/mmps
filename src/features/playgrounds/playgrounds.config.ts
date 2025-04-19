import { TelegramBotConfig } from '@services/telegram';

export const BOT_CONFIG: TelegramBotConfig = {
  id: 'PLAYGROUNDS',
  name: 'Playgrounds Bot 🃏',
  token: 'PLAYGROUNDS_TELEGRAM_BOT_TOKEN',
  commands: {
    START: { command: '/start', description: 'רוצה להתחיל' },
    POLL: { command: '/poll', description: 'התחלת סקר' },
  },
};

export enum BOT_ACTIONS {
  COMPLETE = 'complete',
}
