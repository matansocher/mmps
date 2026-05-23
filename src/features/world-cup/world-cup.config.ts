import type { TelegramBotConfig } from '@services/telegram';

export const BOT_CONFIG: TelegramBotConfig = {
  id: 'WORLD_CUP',
  name: 'World Cup ⚽🏆',
  token: process.env.WORLD_CUP_TELEGRAM_BOT_TOKEN!,
};
