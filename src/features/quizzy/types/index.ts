import { z } from 'zod';

export const triviaQuestionSchema = z
  .object({
    question: z.string(),
    correctAnswer: z.string(),
    distractorAnswers: z.array(z.string()),
  })
  .required();

export type TriviaQuestion = z.infer<typeof triviaQuestionSchema>;

export const messageEvaluationSchema = z
  .object({
    userWantsNewQuestion: z.number().min(0).max(1),
  })
  .required();
