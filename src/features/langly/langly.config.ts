import { TelegramBotConfig } from '@services/telegram';

export const BOT_CONFIG: TelegramBotConfig = {
  id: 'LANGLY',
  name: 'Langly Spanish Teacher 🇪🇸',
  token: 'LANGLY_TELEGRAM_BOT_TOKEN',
  commands: {
    START: { command: '/start', description: 'Start learning Spanish', hide: true },
    LESSON: { command: '/lesson', description: "📚 Get today's lesson" },
    CHALLENGE: { command: '/challenge', description: '🎯 Start a challenge' },
    RANDOM: { command: '/random', description: '🎲 Random expression' },
    HELP: { command: '/help', description: '❓ Show help' },
  },
};

// Schedule times (in hours)
export const MORNING_LESSON_HOUR = 9;
export const EVENING_CHALLENGE_HOUR = 19; // 7 PM

export enum BOT_ACTIONS {
  // Core actions
  START = 'start',
  STOP = 'stop',
  CONTACT = 'contact',

  // Lesson actions
  PRONOUNCE = 'pronounce',
  MORE_EXAMPLES = 'examples',
  WHY_EXPRESSION = 'why',

  // Challenge actions
  ANSWER = 'answer',
  HINT = 'hint',
  SKIP = 'skip',
  NEXT_CHALLENGE = 'next',
}

export const ANALYTIC_EVENT_NAMES = {
  START: 'START',
  STOP: 'STOP',
  CONTACT: 'CONTACT',
  LESSON: 'LESSON',
  CHALLENGE: 'CHALLENGE',
  RANDOM: 'RANDOM',
  ANSWER_CORRECT: 'ANSWER_CORRECT',
  ANSWER_WRONG: 'ANSWER_WRONG',
  PRONOUNCE: 'PRONOUNCE',
  ERROR: 'ERROR',
};

export const LESSON_GENERATION_PROMPT = `
You are Langly, a fun and engaging Spanish teacher for intermediate learners.
Generate a Spanish lesson that focuses on practical, real-world Spanish.

Choose from these topics:
- Idiomatic expressions with interesting origins
- Regional slang (Mexico, Spain, Argentina, etc.)
- False friends that confuse English speakers
- Colloquial phrases used in daily conversation
- Cultural expressions unique to Spanish-speaking countries

Make it fun and memorable! Include:
- Pronunciation tips for difficult sounds
- Cultural context about when/where to use it
- A practical example from real life
- An emoji that captures the essence

Focus on Spanish that people ACTUALLY use, not textbook phrases.
`;

export const CHALLENGE_GENERATION_PROMPT = `
Create an engaging Spanish challenge for intermediate learners.
Make it fun, practical, and culturally relevant!

Types to choose from:
- False friends (words that look similar to English but mean something different)
- Regional variations (same thing said differently in different countries)
- Idiom meanings (literal vs actual meaning)
- Slang translation (modern Spanish slang)
- Real-world scenarios (restaurant, travel, social situations)

Requirements:
- Make the question scenario-based or contextual
- Include 4 options where wrong answers are plausible
- Add a helpful hint that doesn't give it away
- Include a fun fact about Spanish culture or language
- Explain why the answer is correct with cultural context

Remember: This is for intermediate learners who want to sound natural, not like a textbook!
`;
