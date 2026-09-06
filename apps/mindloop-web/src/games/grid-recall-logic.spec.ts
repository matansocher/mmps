import { describe, expect, it } from 'vitest';
import { getGridRecallRoundConfig } from './grid-recall-logic';

describe('GridRecall progression', () => {
  it('grows the grid and pattern gradually', () => {
    expect([0, 1, 2, 3, 4, 9].map((round) => {
      const { size, lit } = getGridRecallRoundConfig(round);
      return { size, lit };
    })).toEqual([
      { size: 3, lit: 3 }, { size: 3, lit: 4 }, { size: 4, lit: 5 },
      { size: 4, lit: 6 }, { size: 5, lit: 7 }, { size: 5, lit: 12 },
    ]);
  });

  it('never turns late rounds into an almost fully lit, easy-to-guess board', () => {
    for (let round = 0; round <= 100; round++) {
      const config = getGridRecallRoundConfig(round);
      expect(config.lit).toBeLessThanOrEqual(Math.floor(config.size ** 2 / 2));
      expect(config.lit).toBeGreaterThanOrEqual(3);
      expect(config.size).toBeLessThanOrEqual(5);
    }
  });

  it('decreases reveal time fairly and increases rewards even after the grid is capped', () => {
    expect(getGridRecallRoundConfig(0).revealMs).toEqual(2000);
    expect(getGridRecallRoundConfig(16).revealMs).toEqual(1200);
    for (let round = 1; round <= 100; round++) {
      const previous = getGridRecallRoundConfig(round - 1);
      const current = getGridRecallRoundConfig(round);
      expect(current.revealMs).toBeLessThanOrEqual(previous.revealMs);
      expect(current.revealMs).toBeGreaterThanOrEqual(1200);
      expect(current.reward).toBeGreaterThan(previous.reward);
      expect(current.lit).toBeGreaterThanOrEqual(previous.lit);
    }
  });
});
