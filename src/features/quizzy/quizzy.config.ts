import { TelegramBotConfig } from '@services/telegram';

export const BOT_CONFIG: TelegramBotConfig = {
  id: 'QUIZZY',
  name: 'Quizzy Bot 🤓',
  token: 'PLAYGROUNDS_TELEGRAM_BOT_TOKEN',
  commands: {
    START: { command: '/start', description: 'התחל מהתחלה', hide: true },
    GAME: { command: '/game', description: '🕹️ משחק 🕹️' },
    ACTIONS: { command: '/actions', description: '⚙️ פעולות ⚙️' },
  },
};

export const ANALYTIC_EVENT_NAMES = {
  START: 'START',
  STOP: 'STOP',
  CONTACT: 'CONTACT',
  GAME: 'GAME',
  ANSWERED: 'ANSWERED',
  MESSAGE: 'MESSAGE',
  ERROR: 'ERROR',
};

export enum BOT_ACTIONS {
  START = 'start',
  STOP = 'stop',
  CONTACT = 'contact',
  GAME = 'game',
}

export const QUIZZY_ASSISTANT_ID = 'asst_QcNCuLWYO5QctyFeacTa79dA';
export const QUIZZY_STRUCTURED_RES_START = 'create a question for the user';
export const QUIZZY_STRUCTURED_RES_INSTRUCTIONS = `
You are generating trivia questions for a Telegram bot. Each question should be multiple-choice with 1 correct answer and 3 plausible incorrect answers. Focus on **medium to hard** difficulty. The goal is to help users learn and expand their knowledge.

- Generate questions from various categories such as: Israeli history, culture, geography, language, inventions, global history, science, literature, philosophy, politics (historical), and nature.
- Avoid easy or obvious questions. Make sure each question teaches something interesting or less commonly known.
- Make incorrect answers believable and relevant to the topic (not silly or easily dismissible).
- Avoid opinion-based or ambiguous questions.
- always provide data in hebrew as the users are hebrew speakers.
`;
