import { describe, expect, it } from 'vitest';
import { CLEANUP_TRIES, cleanupTarget, createCleanup, giveUp, guessCountry, isCleanupFinished } from './cleanup';

const inOrder = () => 0.999;

describe('createCleanup()', () => {
  it('should ask every country once', () => {
    const state = createCleanup(['FR', 'DE', 'ES', 'FR']);
    expect([...state.order].sort()).toEqual(['DE', 'ES', 'FR']);
  });

  it('should refuse an empty pool', () => {
    expect(() => createCleanup([])).toThrow();
  });
});

describe('guessCountry()', () => {
  it('should mark a found country and move on', () => {
    const state = createCleanup(['FR', 'DE'], inOrder);
    const target = cleanupTarget(state);
    const next = guessCountry(state, target);
    expect(next.found).toEqual([target]);
    expect(next.index).toEqual(1);
    expect(next.last).toEqual({ kind: 'found', code: target });
  });

  it('should count wrong picks and reveal after the last try', () => {
    let state = createCleanup(['FR', 'DE'], inOrder);
    const target = cleanupTarget(state);
    state = guessCountry(state, 'IT');
    expect(state.last).toEqual({ kind: 'wrong', code: target, guess: 'IT', triesLeft: CLEANUP_TRIES - 1 });
    for (let i = 1; i < CLEANUP_TRIES; i++) state = guessCountry(state, 'IT');
    expect(state.missed).toEqual([target]);
    expect(state.last).toEqual({ kind: 'revealed', code: target, guess: 'IT' });
    expect(state.misses).toEqual(0);
  });

  it('should ignore countries already on the map', () => {
    let state = createCleanup(['FR', 'DE', 'ES'], inOrder);
    const first = cleanupTarget(state);
    state = guessCountry(state, first);
    expect(guessCountry(state, first)).toBe(state);
  });

  it('should finish after the last country', () => {
    let state = createCleanup(['FR', 'DE'], inOrder);
    state = guessCountry(state, cleanupTarget(state));
    state = giveUp(state);
    expect(isCleanupFinished(state)).toEqual(true);
    expect(state.found).toHaveLength(1);
    expect(state.missed).toHaveLength(1);
    expect(giveUp(state)).toBe(state);
  });
});
