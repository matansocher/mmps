import { z } from 'zod';

export const SpanishChallengeSchema = z.object({
  word: z.string().describe('The Spanish word or phrase being tested'),
  translation: z.string().describe('The correct English translation'),
  type: z.enum(['vocabulary', 'false_friend', 'idiom', 'phrasal_verb', 'colloquial']).describe('Type of challenge'),
  difficulty: z.enum(['intermediate', 'upper_intermediate']).describe('Difficulty level'),
  question: z.string().describe('The challenge question presented to the user'),
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
  exampleSentence: z.string().describe('A natural Spanish sentence using the word/phrase in context'),
  exampleTranslation: z.string().describe('English translation of the example sentence'),
  emoji: z.string().describe('An emoji that represents this challenge'),
});

export type SpanishChallenge = z.infer<typeof SpanishChallengeSchema>;

// Store active challenges in memory (no MongoDB needed)
export interface ActiveChallenge {
  chatId: number;
  messageId: number;
  challenge: SpanishChallenge;
  timestamp: Date;
}
