import { pickQuestions } from './quiz';

export type CleanupEvent =
  | { readonly kind: 'found'; readonly code: string }
  | { readonly kind: 'revealed'; readonly code: string; readonly guess: string | null }; // null = gave up

export type CleanupState = {
  readonly order: readonly string[];
  readonly index: number;
  readonly found: readonly string[];
  readonly missed: readonly string[];
  readonly last: CleanupEvent | null;
};

export function createCleanup(pool: readonly string[], random?: () => number): CleanupState {
  const order = pickQuestions(pool, pool.length, random);
  if (!order.length) throw new Error('No countries to clean up');
  return { order, index: 0, found: [], missed: [], last: null };
}

export const cleanupTarget = (state: CleanupState): string | null => state.order[state.index] ?? null;

export const isCleanupFinished = (state: CleanupState): boolean => state.index >= state.order.length;

export const isOnMap = (state: CleanupState, code: string): boolean => state.found.includes(code) || state.missed.includes(code);

function reveal(state: CleanupState, code: string, guess: string | null): CleanupState {
  return { ...state, index: state.index + 1, missed: [...state.missed, code], last: { kind: 'revealed', code, guess } };
}

export function guessCountry(state: CleanupState, guess: string): CleanupState {
  const code = cleanupTarget(state);
  if (!code || isOnMap(state, guess)) return state;
  if (guess === code) return { ...state, index: state.index + 1, found: [...state.found, code], last: { kind: 'found', code } };
  return reveal(state, code, guess);
}

export function giveUp(state: CleanupState): CleanupState {
  const code = cleanupTarget(state);
  return code ? reveal(state, code, null) : state;
}
