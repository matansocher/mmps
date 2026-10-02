import { pickQuestions } from './quiz';

export const NEIGHBOURS_ROUND_SIZE = 5;
export const MAX_MISSES = 3;

export type NeighboursQuestion = {
  readonly center: string;
  readonly neighbours: readonly string[];
  readonly found: readonly string[];
  readonly misses: readonly string[];
};

export type NeighboursState = {
  readonly questions: readonly NeighboursQuestion[];
  readonly index: number;
  readonly phase: 'asking' | 'answered' | 'finished';
};

export type GuessKind = 'hit' | 'miss' | 'center' | 'repeat';

type Candidate = { readonly code: string; readonly neighbours: readonly string[] };

export function createNeighbours(pool: readonly Candidate[], size = NEIGHBOURS_ROUND_SIZE, random?: () => number): NeighboursState {
  const byCode = new Map(pool.map((candidate) => [candidate.code, candidate]));
  const centers = pickQuestions([...byCode.keys()], size, random);
  if (!centers.length) throw new Error('No countries to ask about');
  const questions = centers.map((center) => ({ center, neighbours: byCode.get(center)!.neighbours, found: [], misses: [] }));
  return { questions, index: 0, phase: 'asking' };
}

export const currentQuestion = (state: NeighboursState): NeighboursQuestion | null => (state.phase === 'finished' ? null : state.questions[state.index]);

export const isComplete = (question: NeighboursQuestion): boolean => question.found.length === question.neighbours.length;

export function classifyGuess(question: NeighboursQuestion, code: string): GuessKind {
  if (code === question.center) return 'center';
  if (question.found.includes(code) || question.misses.includes(code)) return 'repeat';
  return question.neighbours.includes(code) ? 'hit' : 'miss';
}

export function guess(state: NeighboursState, code: string): NeighboursState {
  const question = currentQuestion(state);
  if (state.phase !== 'asking' || !question) return state;
  const kind = classifyGuess(question, code);
  if (kind === 'center' || kind === 'repeat') return state;
  const updated = kind === 'hit' ? { ...question, found: [...question.found, code] } : { ...question, misses: [...question.misses, code] };
  const done = isComplete(updated) || updated.misses.length >= MAX_MISSES;
  return { ...state, questions: state.questions.map((q, i) => (i === state.index ? updated : q)), phase: done ? 'answered' : 'asking' };
}

export const giveUp = (state: NeighboursState): NeighboursState => (state.phase === 'asking' ? { ...state, phase: 'answered' } : state);

export function next(state: NeighboursState): NeighboursState {
  if (state.phase !== 'answered') return state;
  const index = state.index + 1;
  return index >= state.questions.length ? { ...state, phase: 'finished' } : { ...state, index, phase: 'asking' };
}

export const score = (state: NeighboursState): number => state.questions.reduce((sum, q) => sum + q.found.length, 0);

export const maxScore = (state: NeighboursState): number => state.questions.reduce((sum, q) => sum + q.neighbours.length, 0);
