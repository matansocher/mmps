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
  CONTACT: 'CONTACT',
  ERROR: 'ERROR',
};

export enum BOT_ACTIONS {
  SUBSCRIBE = 'subscribe',
  UNSUBSCRIBE = 'unsubscribe',
  ANSWER = 'answer',
  AUDIO = 'audio',
  DIFFICULTY = 'difficulty',
  CONTACT = 'contact',
}

export const INLINE_KEYBOARD_SEPARATOR = '|';

export const DAILY_CHALLENGE_HOURS = [14, 19];

export const DIFFICULTY_LABELS = {
  1: '🌱 Beginner',
  2: '📚 Intermediate',
  3: '🎓 Advanced',
  4: '🏆 Native Speaker',
};

const BASE_PROMPT = `
Generate a Spanish language challenge.
Focus on practical, everyday Spanish that native speakers actually use.

IMPORTANT: Use ARGENTINE SPANISH (from Argentina, not Spain). Use Argentine vocabulary, expressions, and pronunciation patterns.
Generate a DIFFERENT word, phrase, or concept each time. Do not repeat the same content.
Pick from a wide variety of topics: verbs, nouns, adjectives, idioms, expressions, false friends, regional phrases, etc.
`;

const DIFFICULTY_SPECIFIC = {
  1: `DIFFICULTY LEVEL: BEGINNER
- Focus on basic, essential vocabulary and simple phrases
- Use common everyday words that beginners need to know
- Keep sentence structures simple and clear
- Avoid complex idioms or slang
- Target learners who are just starting to learn Spanish
- Example types: basic verbs (ser, estar, tener), common nouns, simple adjectives
- Questions should test fundamental understanding`,

  2: `DIFFICULTY LEVEL: INTERMEDIATE
- Focus on intermediate vocabulary and common expressions
- Include moderately challenging idioms and colloquial phrases
- Use natural sentence structures that are common in conversation
- Include false friends and commonly confused words
- Target learners who have basic knowledge and want to sound more natural
- Example types: phrasal verbs, common idioms, everyday expressions
- Questions should test contextual understanding`,

  3: `DIFFICULTY LEVEL: ADVANCED
- Focus on nuanced vocabulary and sophisticated expressions
- Include complex idioms, regional variations, and cultural references
- Use advanced grammatical structures
- Challenge learners with subtle meaning differences
- Target learners who are near-fluent and want to master the language
- Example types: advanced idioms, formal/informal distinctions, literary expressions
- Questions should test deep understanding and cultural knowledge`,

  4: `DIFFICULTY LEVEL: NATIVE SPEAKER
- Focus on slang, regional expressions, and colloquialisms used by native Argentines
- Include cultural references, wordplay, and extremely nuanced expressions
- Use the most authentic Argentine Spanish possible
- Challenge even native speakers with less common expressions
- Target learners who want to speak like a native Argentine
- Example types: street slang, regional sayings, cultural idioms, lunfardo (Argentine slang)
- Questions should test native-level comprehension and cultural awareness`,
};

const GUIDELINES = `
Guidelines:
- Use Argentine Spanish variants (e.g., "vos" instead of "tú", Argentine slang like "che", "boludo", etc.)
- Choose words/phrases appropriate for the difficulty level
- Include false friends when appropriate
- Include common Argentine idioms and colloquial expressions
- Make the wrong options plausible but clearly incorrect when you understand the context
- Vary the topic type to keep content fresh and engaging

IMPORTANT - Question and Emoji Guidelines:
- The question text itself should NOT contain any emojis
- Keep the question clean and professional without emoji characters
- The emoji field should represent the TYPE of challenge, NOT the answer
- Use emojis like: 🎯 (vocabulary), 🤔 (idioms), 💬 (colloquial), 🔄 (false friends), 📝 (grammar)
- NEVER use an emoji that hints at or relates to the answer itself

The question should test understanding of meaning in context, not just memorization.
The explanation should be concise but informative, helping the learner understand usage in Argentine Spanish.
The example sentence should sound natural and demonstrate real-world usage in Argentina.
`;

export const getDifficultyPrompt = (difficulty: number): string => {
  return `${BASE_PROMPT} ${DIFFICULTY_SPECIFIC[difficulty] || DIFFICULTY_SPECIFIC[2]} ${GUIDELINES}`;
};
