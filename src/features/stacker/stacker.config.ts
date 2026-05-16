import type { TelegramBotConfig } from '@services/telegram';
import { Level, LEVELS, Topic, TOPICS } from '@shared/stacker';

export const BOT_CONFIG: TelegramBotConfig = {
  id: 'STACKER',
  name: 'Stacker 🧠',
  token: 'STACKER_TELEGRAM_BOT_TOKEN',
  commands: {
    START: { command: '/start', description: 'Start', hide: true },
    PLAY: { command: '/play', description: '🎯 Start a new round' },
    STATS: { command: '/stats', description: '📊 Your stats' },
    STOP: { command: '/stop', description: '✋ End current round' },
  },
};

export enum BOT_ACTIONS {
  TOPIC = 'topic',
  LEVEL = 'level',
  ANSWER = 'answer',
  PLAY = 'play',
}

export const INLINE_KEYBOARD_SEPARATOR = '|';

export const TOPIC_LABELS: Record<Topic, string> = {
  [TOPICS.JAVASCRIPT]: '🟨 JavaScript',
  [TOPICS.TYPESCRIPT]: '🟦 TypeScript',
  [TOPICS.NODE]: '🟩 Node.js',
  [TOPICS.PYTHON]: '🐍 Python',
  [TOPICS.ALGORITHMS]: '🧩 Algorithms',
  [TOPICS.SQL]: '🗄️ SQL',
};

export const LEVEL_LABELS: Record<Level, string> = {
  [LEVELS.BEGINNER]: '🌱 Beginner',
  [LEVELS.INTERMEDIATE]: '📚 Intermediate',
  [LEVELS.ADVANCED]: '🎓 Advanced',
};
