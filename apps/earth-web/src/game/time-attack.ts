import { pickQuestions, type QuizAnswer } from './quiz';

export const TIME_ATTACK_MS = 60_000;
export const PENALTY_MS = 3_000;

export type TimeAttackState = {
  readonly queue: readonly string[];
  readonly index: number;
  readonly answers: readonly QuizAnswer[];
  readonly endsAt: number; // epoch ms, moves earlier with every penalty
  readonly phase: 'playing' | 'finished';
};

export function createTimeAttack(pool: readonly string[], now: number, random?: () => number): TimeAttackState {
  const queue = pickQuestions(pool, pool.length, random);
  if (!queue.length) throw new Error('No countries to ask about');
  return { queue, index: 0, answers: [], endsAt: now + TIME_ATTACK_MS, phase: 'playing' };
}

export const timeLeft = (state: TimeAttackState, now: number): number => (state.phase === 'finished' ? 0 : Math.max(0, state.endsAt - now));

export const currentTarget = (state: TimeAttackState): string | null => (state.phase === 'playing' ? state.queue[state.index] : null);

export const score = (state: TimeAttackState): number => state.answers.filter((a) => a.correct).length;

export const tick = (state: TimeAttackState, now: number): TimeAttackState => (state.phase === 'playing' && now >= state.endsAt ? { ...state, phase: 'finished' } : state);

// A skip is a wrong answer with no guess: it costs the same penalty.
export function answer(state: TimeAttackState, guess: string | null, now: number): TimeAttackState {
  const live = tick(state, now);
  if (live.phase !== 'playing') return live;
  const target = live.queue[live.index];
  const correct = guess === target;
  const endsAt = correct ? live.endsAt : live.endsAt - PENALTY_MS;
  const index = live.index + 1;
  const finished = index >= live.queue.length || now >= endsAt;
  return { ...live, index, endsAt, answers: [...live.answers, { target, guess, correct }], phase: finished ? 'finished' : 'playing' };
}
