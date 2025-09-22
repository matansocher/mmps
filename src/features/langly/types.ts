import { z } from 'zod';

export const SpanishLessonSchema = z.object({
  topic: z.string().describe('The main topic or expression being taught'),
  spanish: z.string().describe('The Spanish phrase, word, or expression'),
  literal: z.string().optional().nullable().describe("Literal translation if it's an idiom or expression"),
  meaning: z.string().describe('What it actually means in English'),
  example: z.string().describe('Example sentence in Spanish using the expression'),
  exampleTranslation: z.string().describe('Translation of the example sentence'),
  pronunciation: z.string().optional().nullable().describe('Pronunciation guide using phonetics'),
  culturalNote: z.string().optional().nullable().describe('Interesting cultural context, origin, or regional variation'),
  emoji: z.string().describe('A fun emoji that represents the concept'),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']).describe('Difficulty level'),
});

export const SpanishChallengeSchema = z.object({
  type: z.enum(['multiple_choice', 'false_friends', 'regional', 'idiom', 'slang', 'translation']).describe('Type of challenge'),
  question: z.string().describe('The challenge question in a fun, engaging way'),
  context: z.string().optional().nullable().describe('Additional context or scenario to make it more interesting'),
  options: z
    .array(
      z.object({
        text: z.string().describe('The answer option'),
        isCorrect: z.boolean().describe('Whether this is the correct answer'),
      }),
    )
    .length(4)
    .describe('Exactly 4 answer options'),
  correctAnswer: z.string().describe('The correct answer text'),
  explanation: z.string().describe('Fun explanation of why this is correct, with cultural context'),
  hint: z.string().describe('A helpful hint without giving away the answer'),
  funFact: z.string().describe('An interesting fact related to the challenge'),
  emoji: z.string().describe('An emoji that represents this challenge'),
});

export type SpanishLesson = z.infer<typeof SpanishLessonSchema>;
export type SpanishChallenge = z.infer<typeof SpanishChallengeSchema>;
