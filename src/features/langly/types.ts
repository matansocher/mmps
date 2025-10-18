import type { ObjectId } from 'mongodb';
import { z } from 'zod';

// Challenge type enum for tracking
export enum ChallengeType {
  MULTIPLE_CHOICE = 'multiple_choice',
  FILL_IN_BLANK = 'fill_in_blank',
  DIALOGUE = 'dialogue',
  CONTEXT_MATCHING = 'context_matching',
  SYNONYM_ANTONYM = 'synonym_antonym',
}

// Original multiple choice challenge
export const MultipleChoiceChallengeSchema = z.object({
  challengeType: z.literal(ChallengeType.MULTIPLE_CHOICE),
  word: z.string().describe('The word or phrase being tested in the target language'),
  translation: z.string().describe('The correct English translation'),
  type: z.enum(['vocabulary', 'false_friend', 'idiom', 'phrasal_verb', 'colloquial']).describe('Type of challenge'),
  difficulty: z.enum(['intermediate', 'upper_intermediate']).describe('Difficulty level'),
  question: z.string().describe('The challenge question presented to the user. Do NOT include any emoji in the question text'),
  options: z
    .array(
      z.object({
        text: z.string().max(50).describe('The answer option in English - MUST be under 50 characters'),
        isCorrect: z.boolean().describe('Whether this is the correct answer'),
      }),
    )
    .length(4)
    .describe('Exactly 4 answer options'),
  explanation: z.string().describe('Clear explanation of why this is correct, with usage context'),
  exampleSentence: z.string().describe('A natural sentence in the target language using the word/phrase in context'),
  exampleTranslation: z.string().describe('English translation of the example sentence'),
  emoji: z.string().describe('An emoji that represents the TYPE of challenge (e.g., 🎯 for vocabulary, 🤔 for idioms, 💬 for colloquial). NEVER use an emoji related to the answer itself'),
});

// Fill in the blank challenge
export const FillInBlankChallengeSchema = z.object({
  challengeType: z.literal(ChallengeType.FILL_IN_BLANK),
  word: z.string().describe('The word or phrase being tested'),
  translation: z.string().describe('The correct English translation'),
  type: z.enum(['vocabulary', 'grammar', 'idiom', 'verb_conjugation', 'preposition']).describe('Type of challenge'),
  sentence: z.string().describe('A sentence in the target language with "___" as a placeholder for the missing word/phrase'),
  sentenceTranslation: z.string().describe('English translation of the complete sentence'),
  options: z
    .array(
      z.object({
        text: z.string().max(50).describe('The answer option - MUST be under 50 characters to fit in Telegram button'),
        isCorrect: z.boolean().describe('Whether this is the correct answer'),
      }),
    )
    .length(4)
    .describe('Exactly 4 answer options - keep them SHORT'),
  explanation: z.string().describe('Clear explanation of why this answer is correct, including grammar or usage rules'),
  emoji: z.literal('📝').describe('Emoji for fill-in-blank challenges'),
});

// Dialogue completion challenge
export const DialogueChallengeSchema = z.object({
  challengeType: z.literal(ChallengeType.DIALOGUE),
  context: z.string().describe('Brief context for the dialogue (e.g., "At a restaurant", "Meeting a friend")'),
  speakerA: z.string().describe('What the first speaker says in the target language'),
  speakerATranslation: z.string().describe('English translation of speaker A'),
  question: z.string().describe('What should speaker B respond? (in English)'),
  options: z
    .array(
      z.object({
        text: z.string().max(50).describe('Response option in the target language - MUST be under 50 characters for Telegram'),
        translation: z.string().describe('English translation of this response'),
        isCorrect: z.boolean().describe('Whether this is the most natural/appropriate response'),
      }),
    )
    .length(4)
    .describe('Exactly 4 response options'),
  explanation: z.string().describe('Explain why the correct response is the most natural and what makes the others less appropriate'),
  emoji: z.literal('💬').describe('Emoji for dialogue challenges'),
});

// Context matching challenge
export const ContextMatchingChallengeSchema = z.object({
  challengeType: z.literal(ChallengeType.CONTEXT_MATCHING),
  word: z.string().describe('The word or expression being tested in the target language'),
  translation: z.string().describe('English translation'),
  type: z.enum(['slang', 'formal', 'informal', 'regional', 'register']).describe('Type of context test'),
  question: z.string().describe('Question asking which context is appropriate (e.g., "In which situation would you use this expression?")'),
  options: z
    .array(
      z.object({
        text: z.string().max(60).describe('Contextual scenario description - MUST be under 60 characters for Telegram'),
        isCorrect: z.boolean().describe('Whether this is the appropriate context'),
      }),
    )
    .length(4)
    .describe('Exactly 4 contextual scenarios'),
  explanation: z.string().describe('Explain the appropriate context and why this word/phrase fits there'),
  exampleSentence: z.string().describe('Example sentence using the word in the correct context'),
  exampleTranslation: z.string().describe('English translation of the example'),
  emoji: z.literal('🎭').describe('Emoji for context matching challenges'),
});

// Synonym/Antonym challenge
export const SynonymAntonymChallengeSchema = z.object({
  challengeType: z.literal(ChallengeType.SYNONYM_ANTONYM),
  targetWord: z.string().describe('The target word in the target language'),
  targetTranslation: z.string().describe('English translation of the target word'),
  questionType: z.enum(['synonym', 'antonym']).describe('Whether to find a synonym or antonym'),
  question: z.string().describe('The question (e.g., "Find the synonym for X" or "Find the antonym for X")'),
  options: z
    .array(
      z.object({
        text: z.string().max(30).describe('Single word or very short phrase - MUST be under 30 characters for Telegram'),
        translation: z.string().describe('English translation of this option'),
        isCorrect: z.boolean().describe('Whether this is the correct synonym/antonym'),
      }),
    )
    .length(4)
    .describe('Exactly 4 word options'),
  explanation: z.string().describe('Explain the relationship between the words and any nuances'),
  exampleSentence: z.string().describe('Example sentence using the correct answer'),
  exampleTranslation: z.string().describe('English translation of the example'),
  emoji: z.literal('🔄').describe('Emoji for synonym/antonym challenges'),
});

// Union type for all challenge types
export const ChallengeSchema = z.discriminatedUnion('challengeType', [
  MultipleChoiceChallengeSchema,
  FillInBlankChallengeSchema,
  DialogueChallengeSchema,
  ContextMatchingChallengeSchema,
  SynonymAntonymChallengeSchema,
]);

export type Challenge = z.infer<typeof ChallengeSchema>;
export type MultipleChoiceChallenge = z.infer<typeof MultipleChoiceChallengeSchema>;
export type FillInBlankChallenge = z.infer<typeof FillInBlankChallengeSchema>;
export type DialogueChallenge = z.infer<typeof DialogueChallengeSchema>;
export type ContextMatchingChallenge = z.infer<typeof ContextMatchingChallengeSchema>;
export type SynonymAntonymChallenge = z.infer<typeof SynonymAntonymChallengeSchema>;

// Legacy type alias for backward compatibility
export type LanguageChallenge = Challenge;
export const LanguageChallengeSchema = ChallengeSchema;

// Store active challenges in MongoDB
export type ActiveChallenge = {
  readonly _id: ObjectId;
  readonly chatId: number;
  readonly messageId: number;
  readonly challenge: Challenge;
  readonly timestamp: Date;
};
