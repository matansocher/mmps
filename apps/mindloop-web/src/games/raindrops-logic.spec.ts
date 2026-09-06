import { describe, expect, it } from 'vitest';
import { advanceDrops, findLowestMatch, getDropReward } from './raindrops-logic';
import type { Drop } from './raindrops-logic';

const drops: Drop[] = [
  { id: 1, text: '2 + 2', answer: 4, x: 0.2, y: 0.1, speed: 0.1, level: 0 },
  { id: 2, text: '8 - 4', answer: 4, x: 0.5, y: 0.9, speed: 0.1, level: 1 },
  { id: 3, text: '2 + 3', answer: 5, x: 0.8, y: 0.95, speed: 0.1, level: 1 },
];

describe('Raindrops physics and matching', () => {
  it('rewards the difficulty at which a drop was spawned', () => {
    expect(getDropReward(drops[0])).toEqual(27);
    expect(getDropReward({ ...drops[0], level: 3 })).toEqual(42);
  });
  it('clears the lowest matching drop, not the first matching drop', () => {
    expect(findLowestMatch(drops, 4)?.id).toEqual(2);
    expect(findLowestMatch(drops, 9)).toEqual(undefined);
  });

  it('counts simultaneous misses exactly once without mutating the input', () => {
    const next = advanceDrops(drops, 1);
    expect(next.missed).toEqual(2);
    expect(next.drops.map((drop) => drop.id)).toEqual([1]);
    expect(advanceDrops(next.drops, 0).missed).toEqual(0);
    expect(drops[0].y).toEqual(0.1);
  });

  it('accounts for elapsed time after a delayed frame', () => {
    expect(advanceDrops(drops, 20)).toEqual({ drops: [], missed: 3 });
  });
});
