import { TelegramBotConfig } from '@services/telegram';

export const BOT_CONFIG: TelegramBotConfig = {
  id: 'COOKER',
  name: 'Cooker Bot 👨‍🍳️',
  token: 'COOKER_TELEGRAM_BOT_TOKEN',
  commands: {
    START: { command: '/start', description: 'התחל מהתחלה', hide: true },
    RECIPES: { command: '/recipes', description: 'מתכונים' },
  },
};

export enum BOT_ACTIONS {
  SHOW = 'show',
}
