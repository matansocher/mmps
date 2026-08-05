import type { TelegramBotConfig } from '@services/telegram';

export const BOT_CONFIG: TelegramBotConfig = {
  id: 'LEARNER',
  name: 'Learner 🎓',
  token: 'LEARNER_TELEGRAM_BOT_TOKEN',
  commands: {
    START: { command: '/start', description: 'Open the Learner app', hide: true },
  },
};
