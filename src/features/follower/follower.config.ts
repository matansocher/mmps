import type { TelegramBotConfig } from '@services/telegram';

export const BOT_CONFIG: TelegramBotConfig = {
  id: 'FOLLOWER',
  name: 'Follower Bot 📹',
  token: 'FOLLOWER_TELEGRAM_BOT_TOKEN',
  commands: {
    START: { command: '/start', description: 'Start the bot', hide: true },
    LIST: { command: '/list', description: '📄 Show your followed channels' },
    ACTIONS: { command: '/actions', description: '⚙️ Manage notifications and settings' },
  },
};

export const BOT_ACTIONS = {
  REMOVE: 'REMOVE',
  DISABLE_NOTIFICATIONS: 'DISABLE_NOTIFICATIONS',
  ENABLE_NOTIFICATIONS: 'ENABLE_NOTIFICATIONS',
  CONTACT: 'CONTACT',
  HELP: 'HELP',
} as const;

export const INLINE_KEYBOARD_SEPARATOR = '|';

export const MESSAGES = {
  WELCOME: [
    'Welcome to the Follower Bot! 👋',
    '',
    'I help you track new videos from your favorite TikTok and YouTube channels.',
    '',
    'Commands:',
    '/add <URL> - Add a channel to follow',
    '/list - View and manage your subscriptions',
    "/actions - Show bot's actions",
    '',
    'Just send me a TikTok or YouTube channel URL to get started!',
  ].join('\n'),

  HELP: [
    '📹 Follower Bot Help',
    '',
    'Send me a channel URL from:',
    '• TikTok: https://www.tiktok.com/@username',
    '• YouTube: https://www.youtube.com/@handle or /channel/ID',
    '',
    "I'll notify you when new videos are posted!",
  ].join('\n'),

  NO_SUBSCRIPTIONS: 'You have no active subscriptions. Send me a channel URL to get started!',

  INVALID_URL: ['Invalid URL format. Please send a valid channel URL:', '• TikTok: https://www.tiktok.com/@username', '• YouTube: https://www.youtube.com/@handle'].join('\n'),

  CHANNEL_NOT_FOUND: 'Channel not found. Please check the URL and try again.',

  ALREADY_SUBSCRIBED: "You're already following this channel!",

  NOTIFICATIONS_DISABLED: '🔕 Notifications disabled. Your subscriptions are saved and you can re-enable notifications anytime from /actions.',

  NOTIFICATIONS_ENABLED: '🔔 Notifications enabled! You will receive alerts for new videos.',

  CONTACT: 'For support or feedback, please contact: @YourUsername',

  ERROR: 'Sorry, an error occurred. Please try again later.',
};
