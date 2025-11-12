import type { ObjectId } from 'mongodb';
import { z } from 'zod';

export enum DifficultyLevel {
  BEGINNER = 1,
  INTERMEDIATE = 2,
  ADVANCED = 3,
  NATIVE = 4,
}

export const Language = {
  HEBREW: 'hebrew',
  ENGLISH: 'english',
  SPANISH: 'spanish',
  FRENCH: 'french',
  ARABIC: 'arabic',
} as const;

export type Language = (typeof Language)[keyof typeof Language];

export type UserPreferences = {
  readonly _id: ObjectId;
  readonly chatId: number;
  readonly isStopped: boolean;
  previousResponseId?: string;
  difficulty?: DifficultyLevel;
  language?: Language;
  readonly createdAt: Date;
};

// Store active challenges in MongoDB
export type ActiveChallenge = {
  readonly _id: ObjectId;
  readonly chatId: number;
  readonly messageId: number;
  readonly challenge: LanguageChallenge;
  readonly timestamp: Date;
};

export const LanguageChallengeSchema = z.object({
  word: z.string().describe('The word or phrase being tested in the target language'),
  translation: z.string().describe('The correct English translation'),
  type: z.enum(['vocabulary', 'false_friend', 'idiom', 'phrasal_verb', 'colloquial']).describe('Type of challenge'),
  difficulty: z.enum(['intermediate', 'upper_intermediate']).describe('Difficulty level'),
  question: z.string().describe('The challenge question presented to the user. Do NOT include any emoji in the question text'),
  options: z
    .array(
      z.object({
        text: z.string().describe('The answer option in English'),
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

export type LanguageChallenge = z.infer<typeof LanguageChallengeSchema>;
