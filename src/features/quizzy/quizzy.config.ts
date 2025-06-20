import { TelegramBotConfig } from '@services/telegram';

export const BOT_CONFIG: TelegramBotConfig = {
  id: 'QUIZZY',
  name: 'Quizzy Bot 🤓',
  token: 'QUIZZY_TELEGRAM_BOT_TOKEN',
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
  EXPLAINED: 'EXPLAINED',
  ANSWERED: 'ANSWERED',
  MESSAGE: 'MESSAGE',
  ERROR: 'ERROR',
};

export enum BOT_ACTIONS {
  START = 'start',
  STOP = 'stop',
  CONTACT = 'contact',
  GAME = 'game',
  EXPLAIN = 'explain',
}

export const QUIZZY_ASSISTANT_ID = 'asst_QcNCuLWYO5QctyFeacTa79dA';
export const QUIZZY_STRUCTURED_RES_START = 'create a question for the user';
export const QUIZZY_STRUCTURED_RES_INSTRUCTIONS = `
You are generating trivia questions for a Telegram bot that aims to help users expand their knowledge in a fun, enriching, and engaging way.
Each question should be a multiple-choice question with 1 correct answer and 3 plausible but incorrect answers. Please make your best so that each answer is not more than 40 chars.
Your goal is to create questions that spark curiosity, invite follow-up explanations, and make users look forward to coming back every day.
Think of questions users might talk about with friends, say “Wait, really?” — and want to know why.
Guidelines:
All questions and answers must be in Hebrew — the users are native Hebrew speakers.
The difficulty should be medium to hard — avoid simple, common trivia.
Write questions that make users say: “Why is that the right answer?” or “I didn’t know that — interesting!”
Cover any interesting and educational topic — you’re not limited to predefined categories. Good examples include:
History, science, language, geography, culture, inventions, literature, psychology, technology, surprising facts, food, music, art, nature, space, etc.
Avoid questions about current political controversies, recent news, or opinion-based answers.
Incorrect answers must be plausible and relevant — don’t make them silly or obviously wrong.
It’s OK to add a subtle hint to context (e.g. “This happened in the 1960s”).
Every question should teach something interesting, not just test memory.
`;

export const INLINE_KEYBOARD_SEPARATOR = ' - ';
