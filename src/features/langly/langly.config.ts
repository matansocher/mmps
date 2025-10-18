import { TelegramBotConfig } from '@services/telegram';
import { Language } from '@shared/langly';

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
  LANGUAGE = 'language',
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

export const LANGUAGE_LABELS: Record<Language, string> = {
  hebrew: '🇮🇱 Hebrew',
  english: '🇺🇸 English',
  spanish: '🇦🇷 Spanish',
  french: '🇫🇷 French',
  arabic: '🇸🇦 Arabic',
};

const LANGUAGE_SPECIFIC_INSTRUCTIONS: Record<Language, string> = {
  spanish: `Use ARGENTINE SPANISH (from Argentina, not Spain). Use Argentine vocabulary, expressions, and pronunciation patterns (e.g., "vos" instead of "tú", Argentine slang like "che", "boludo", etc.).`,
  hebrew: `Use MODERN HEBREW as spoken in Israel. Include contemporary expressions, slang, and colloquialisms used by native Hebrew speakers.`,
  english: `Use AMERICAN ENGLISH. Focus on natural, everyday language, idioms, and expressions commonly used by native English speakers.`,
  french: `Use FRENCH as spoken in France. Include common idioms, colloquial expressions, and vocabulary used in everyday conversation.`,
  arabic: `Use MODERN STANDARD ARABIC with focus on colloquial expressions. Include commonly used phrases and vocabulary in everyday conversation.`,
};

const BASE_PROMPT = `
Generate a language learning challenge in the specified target language.
Focus on practical, everyday language that native speakers actually use.

Generate a DIFFERENT word, phrase, or concept each time. Do not repeat the same content.
Pick from a wide variety of topics: verbs, nouns, adjectives, idioms, expressions, false friends, regional phrases, etc.
`;

const DIFFICULTY_SPECIFIC = {
  1: `DIFFICULTY LEVEL: BEGINNER
- Focus on basic, essential vocabulary and simple phrases
- Use common everyday words that beginners need to know
- Keep sentence structures simple and clear
- Avoid complex idioms or slang
- Target learners who are just starting to learn the language
- Example types: basic verbs, common nouns, simple adjectives
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
- Focus on slang, regional expressions, and colloquialisms used by native speakers
- Include cultural references, wordplay, and extremely nuanced expressions
- Use the most authentic regional variant possible
- Challenge even native speakers with less common expressions
- Target learners who want to speak like a native
- Example types: street slang, regional sayings, cultural idioms
- Questions should test native-level comprehension and cultural awareness`,
};

const GUIDELINES = `
Guidelines:
- Choose words/phrases appropriate for the difficulty level
- Include false friends when appropriate
- Include common idioms and colloquial expressions
- Make the wrong options plausible but clearly incorrect when you understand the context
- Vary the topic type to keep content fresh and engaging

IMPORTANT - Question and Emoji Guidelines:
- The question text itself should NOT contain any emojis
- Keep the question clean and professional without emoji characters
- The emoji field should represent the TYPE of challenge, NOT the answer
- Use emojis like: 🎯 (vocabulary), 🤔 (idioms), 💬 (colloquial), 🔄 (false friends), 📝 (grammar)
- NEVER use an emoji that hints at or relates to the answer itself

The question should test understanding of meaning in context, not just memorization.
The explanation should be concise but informative, helping the learner understand usage.
The example sentence should sound natural and demonstrate real-world usage.
`;

export const getDifficultyPrompt = (difficulty: number, language: Language = Language.SPANISH): string => {
  const languageInstruction = LANGUAGE_SPECIFIC_INSTRUCTIONS[language] || LANGUAGE_SPECIFIC_INSTRUCTIONS[Language.SPANISH];
  return `${BASE_PROMPT}

LANGUAGE: ${language.toUpperCase()}
${languageInstruction}

${DIFFICULTY_SPECIFIC[difficulty] || DIFFICULTY_SPECIFIC[2]}

${GUIDELINES}`;
};
