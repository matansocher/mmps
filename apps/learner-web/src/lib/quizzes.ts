import { QUIZZES } from './quizzes.data';
import type { QuizQuestion } from './types';

export { QUIZZES };

export function quizzesForBite(biteId: string): QuizQuestion[] {
  return QUIZZES.filter((q) => q.biteId === biteId);
}

export function hasQuiz(biteId: string): boolean {
  return QUIZZES.some((q) => q.biteId === biteId);
}
