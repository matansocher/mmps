import { TelegramBotConfig } from '@services/telegram';

export const BOT_CONFIG: TelegramBotConfig = {
  id: 'LANGLY',
  name: 'Langly 🌎',
  token: 'LANGLY_TELEGRAM_BOT_TOKEN',
  commands: {
    START: { command: '/start', description: 'Start', hide: true },
    CHALLENGE: { command: '/challenge', description: '🎯 Start a challenge' },
    ACTIONS: { command: '/actions', description: '⚙️ Actions ⚙️' },
  },
};

export const ANALYTIC_EVENT_NAMES = {
  START: 'START',
  SUBSCRIBE: 'SUBSCRIBE',
  UNSUBSCRIBE: 'UNSUBSCRIBE',
  CHALLENGE: 'CHALLENGE',
  ANSWERED: 'ANSWERED',
  AUDIO: 'AUDIO',
  ERROR: 'ERROR',
};

export enum BOT_ACTIONS {
  SUBSCRIBE = 'subscribe',
  UNSUBSCRIBE = 'unsubscribe',
  ANSWER = 'answer',
  AUDIO = 'audio',
}

export const INLINE_KEYBOARD_SEPARATOR = '|';

export const DAILY_CHALLENGE_HOURS = [14, 19];

export const CHALLENGE_GENERATION_PROMPT = `
Generate a Spanish language challenge for intermediate to upper-intermediate learners.
Focus on practical, everyday Spanish that native speakers actually use.

IMPORTANT: Generate a DIFFERENT word, phrase, or concept each time. Do not repeat the same content.
Pick from a wide variety of topics: verbs, nouns, adjectives, idioms, expressions, false friends, regional phrases, etc.

Guidelines:
- Choose words/phrases that are commonly used but often confusing for English speakers
- Include false friends (words that look similar to English but mean something different)
- Include common idioms and colloquial expressions
- Include regional variations when relevant
- Make the wrong options plausible but clearly incorrect when you understand the context
- Vary the difficulty and topic type to keep content fresh and engaging

The question should test understanding of meaning in context, not just memorization.
The explanation should be concise but informative, helping the learner understand usage.
The example sentence should sound natural and demonstrate real-world usage.

Target learners who:
- Have basic Spanish knowledge (A2-B2 level)
- Want to sound more natural and less like a textbook
- Are interested in understanding native speakers in real conversations
`;
