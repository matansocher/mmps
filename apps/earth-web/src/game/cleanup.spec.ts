import { describe, expect, it } from 'vitest';
import { cleanupTarget, createCleanup, giveUp, guessCountry, isCleanupFinished } from './cleanup';

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

  it('should reveal the country on the first wrong pick', () => {
    let state = createCleanup(['FR', 'DE'], inOrder);
    const target = cleanupTarget(state);
    state = guessCountry(state, 'IT');
    expect(state.missed).toEqual([target]);
    expect(state.index).toEqual(1);
    expect(state.last).toEqual({ kind: 'revealed', code: target, guess: 'IT' });
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
