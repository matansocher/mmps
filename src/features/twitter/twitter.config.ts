import { TelegramBotConfig } from '@services/telegram';

export const BOT_CONFIG: TelegramBotConfig = {
  id: 'TWITTER',
  name: 'Twitter 🐦',
  token: 'TWITTER_TELEGRAM_BOT_TOKEN',
  commands: {
    START: { command: '/start', description: 'Start the bot', hide: true },
    LIST: { command: '/list', description: '📋 List subscribed users' },
  },
};

export const BOT_ACTIONS = {
  REMOVE_USER: 'remove_user',
} as const;

export const ANALYTIC_EVENT_NAMES = {
  START: 'start',
  ADD_SUBSCRIPTION: 'add_subscription',
  REMOVE_SUBSCRIPTION: 'remove_subscription',
  LIST_SUBSCRIPTIONS: 'list_subscriptions',
} as const;
