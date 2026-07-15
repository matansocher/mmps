import type { TelegramBotConfig } from '@services/telegram';

// Clutch is a static web mini-app (no Telegram bot of its own). This config only
// supplies a display name for the analytics notifications routed through the notifier.
export const BOT_CONFIG: TelegramBotConfig = {
  id: 'CLUTCH',
  name: 'Clutch 🏆',
  token: 'NOTIFIER_TELEGRAM_BOT_TOKEN',
};
