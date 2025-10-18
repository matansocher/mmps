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

// Fill in the Blank Prompts
const FILL_IN_BLANK_BASE = `
Generate a fill-in-the-blank language learning challenge in the specified target language.
The challenge should test the learner's ability to choose the correct word/phrase to complete a sentence.

Focus on:
- Natural, everyday sentences that native speakers use
- Clear context that makes the correct answer logical
- Grammar, verb conjugations, prepositions, or vocabulary
- Making wrong options plausible but clearly incorrect in context
`;

const FILL_IN_BLANK_GUIDELINES = `
CRITICAL TELEGRAM CONSTRAINTS:
- Each answer option MUST be under 50 characters (hard limit for Telegram buttons)
- Keep options SHORT: single words or very brief phrases only
- No long explanations in the options themselves

The sentence should clearly indicate what type of word is missing through context.
Wrong options should be grammatically possible but contextually or semantically wrong.
The explanation should clarify grammar rules or usage patterns.
`;

export const getFillInBlankPrompt = (difficulty: number, language: Language = Language.SPANISH): string => {
  const languageInstruction = LANGUAGE_SPECIFIC_INSTRUCTIONS[language] || LANGUAGE_SPECIFIC_INSTRUCTIONS[Language.SPANISH];
  return `${FILL_IN_BLANK_BASE}

LANGUAGE: ${language.toUpperCase()}
${languageInstruction}

${DIFFICULTY_SPECIFIC[difficulty] || DIFFICULTY_SPECIFIC[2]}

${FILL_IN_BLANK_GUIDELINES}`;
};

// Dialogue Completion Prompts
const DIALOGUE_BASE = `
Generate a dialogue completion challenge in the specified target language.
Present a realistic conversation where the learner must choose the most natural and appropriate response.

Focus on:
- Real-world conversational situations
- Natural, colloquial responses that natives would actually use
- Cultural appropriateness and social context
- Register (formal vs informal) matching the situation
`;

const DIALOGUE_GUIDELINES = `
CRITICAL TELEGRAM CONSTRAINTS:
- Each response option MUST be under 50 characters (hard limit for Telegram buttons)
- Keep dialogue responses SHORT and natural
- Use common, everyday phrases

The context should be clear (e.g., "At a café", "Meeting a friend", "Job interview")
Speaker A's line should set up a clear conversational situation
All 4 responses should be grammatically correct, but only one should be the most natural/appropriate
The explanation should highlight why one response is more natural and culturally appropriate
`;

export const getDialoguePrompt = (difficulty: number, language: Language = Language.SPANISH): string => {
  const languageInstruction = LANGUAGE_SPECIFIC_INSTRUCTIONS[language] || LANGUAGE_SPECIFIC_INSTRUCTIONS[Language.SPANISH];
  return `${DIALOGUE_BASE}

LANGUAGE: ${language.toUpperCase()}
${languageInstruction}

${DIFFICULTY_SPECIFIC[difficulty] || DIFFICULTY_SPECIFIC[2]}

${DIALOGUE_GUIDELINES}`;
};

// Context Matching Prompts
const CONTEXT_MATCHING_BASE = `
Generate a context matching challenge where the learner identifies the appropriate situation to use a word or expression.
This tests understanding of register, formality, and social appropriateness.

Focus on:
- Words/expressions that have specific contextual constraints
- Clear distinction between formal/informal, regional/standard, appropriate/inappropriate contexts
- Cultural and social nuances
- Realistic situations where the expression would or wouldn't be used
`;

const CONTEXT_MATCHING_GUIDELINES = `
CRITICAL TELEGRAM CONSTRAINTS:
- Each scenario description MUST be under 60 characters (hard limit for Telegram buttons)
- Use concise, clear scenario descriptions (e.g., "Job interview", "Texting a friend", "Family dinner")
- Be specific but brief

Choose expressions where context really matters (slang, formal terms, regional phrases, etc.)
Create 4 distinct scenarios with varying levels of formality or social contexts
Only one scenario should be truly appropriate for the expression
The explanation should clarify why the expression fits that specific context
`;

export const getContextMatchingPrompt = (difficulty: number, language: Language = Language.SPANISH): string => {
  const languageInstruction = LANGUAGE_SPECIFIC_INSTRUCTIONS[language] || LANGUAGE_SPECIFIC_INSTRUCTIONS[Language.SPANISH];
  return `${CONTEXT_MATCHING_BASE}

LANGUAGE: ${language.toUpperCase()}
${languageInstruction}

${DIFFICULTY_SPECIFIC[difficulty] || DIFFICULTY_SPECIFIC[2]}

${CONTEXT_MATCHING_GUIDELINES}`;
};

// Synonym/Antonym Prompts
const SYNONYM_ANTONYM_BASE = `
Generate a synonym or antonym challenge where the learner finds a word with similar or opposite meaning.
This tests vocabulary depth and understanding of semantic relationships.

Focus on:
- Common words that have clear synonyms/antonyms
- Nuanced differences between similar words
- Context where these relationships are relevant
- Building vocabulary connections
`;

const SYNONYM_ANTONYM_GUIDELINES = `
CRITICAL TELEGRAM CONSTRAINTS:
- Each word option MUST be under 30 characters (hard limit for Telegram buttons)
- Use SINGLE WORDS or at most 2-word phrases
- Keep it simple and concise

Choose target words appropriate for the difficulty level
For synonyms: include words with subtle differences in meaning or usage
For antonyms: use clear opposites that learners should know
Include plausible distractors (related words that aren't quite synonyms/antonyms)
The explanation should clarify nuances and usage differences
`;

export const getSynonymAntonymPrompt = (difficulty: number, language: Language = Language.SPANISH): string => {
  const languageInstruction = LANGUAGE_SPECIFIC_INSTRUCTIONS[language] || LANGUAGE_SPECIFIC_INSTRUCTIONS[Language.SPANISH];
  return `${SYNONYM_ANTONYM_BASE}

LANGUAGE: ${language.toUpperCase()}
${languageInstruction}

${DIFFICULTY_SPECIFIC[difficulty] || DIFFICULTY_SPECIFIC[2]}

${SYNONYM_ANTONYM_GUIDELINES}`;
};
