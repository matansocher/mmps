import { TriviaQuestion } from '../types';

export function generateInitialExplanationPrompt({ question, correctAnswer, distractorAnswers }: TriviaQuestion, selectedAnswer: string) {
  return [
    `The question was ${question}, and I answered ${selectedAnswer}, And all the options were: ${[...distractorAnswers, correctAnswer].join(', ')}.`,
    `The bot told me that the correct answer is: ${correctAnswer}.`,
    `If I am right please elaborate a bit more about the question and the correct answer, and if I am wrong, explain what is the correct answer and why it is correct in a way that I can learn and a tip to remember the answer.`,
  ].join(' ');
}
