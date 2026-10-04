export const ROUND_SIZE = 10;

export type QuizAnswer = {
  readonly target: string;
  readonly guess: string | null; // null = skipped
  readonly correct: boolean;
};

export type QuizPhase = 'asking' | 'answered' | 'finished';

export type QuizState = {
  readonly questions: readonly string[];
  readonly index: number;
  readonly answers: readonly QuizAnswer[];
  readonly phase: QuizPhase;
};

export function pickQuestions(pool: readonly string[], size: number, random: () => number = Math.random): string[] {
  const shuffled = [...new Set(pool)];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, size);
}

export function createQuiz(pool: readonly string[], size = ROUND_SIZE, random?: () => number): QuizState {
  const questions = pickQuestions(pool, size, random);
  if (!questions.length) throw new Error('No countries to ask about');
  return { questions, index: 0, answers: [], phase: 'asking' };
}

export const currentTarget = (state: QuizState): string | null => (state.phase === 'finished' ? null : state.questions[state.index]);

export const lastAnswer = (state: QuizState): QuizAnswer | null => state.answers.at(-1) ?? null;

export const score = (state: QuizState): number => state.answers.filter((a) => a.correct).length;

export function answer(state: QuizState, guess: string | null): QuizState {
  if (state.phase !== 'asking') return state;
  const target = state.questions[state.index];
  return { ...state, answers: [...state.answers, { target, guess, correct: guess === target }], phase: 'answered' };
}

export const skip = (state: QuizState): QuizState => answer(state, null);

export function next(state: QuizState): QuizState {
  if (state.phase !== 'answered') return state;
  const index = state.index + 1;
  return index >= state.questions.length ? { ...state, phase: 'finished' } : { ...state, index, phase: 'asking' };
}
