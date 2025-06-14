import { z } from 'zod';

export const triviaSchema = z
  .object({
    question: z.string(),
    correctAnswer: z.string(),
    distractorAnswers: z.array(z.string()),
  })
  .required();

export type Trivia = z.infer<typeof triviaSchema>;
