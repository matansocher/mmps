import { afterEach, describe, expect, it, vi } from 'vitest';
import { createShapeRound, INITIAL_SHAPE_SCORE, mirrorShape, rotateShape, scoreShapeAnswer, shapeIdentity } from './shape-shift';
import type { Shape } from './shape-shift';

afterEach(() => vi.restoreAllMocks());

describe('Shape Shift', () => {
  const shape: Shape = [
    [0, 0],
    [0, 1],
    [0, 2],
    [1, 2],
  ];

  it('recognizes rotation and translation but not reflection', () => {
    for (let turns = 0; turns < 4; turns++) {
      expect(shapeIdentity(rotateShape(shape, turns))).toEqual(shapeIdentity(shape));
    }
    expect(shapeIdentity(shape.map(([x, y]) => [x + 3, y - 5]))).toEqual(shapeIdentity(shape));
    expect(shapeIdentity(mirrorShape(shape))).not.toEqual(shapeIdentity(shape));
    expect(rotateShape(shape, 4)).toEqual(shape);
  });

  it('generates distinct equal-size options with exactly one correct rotation at every difficulty', () => {
    let seed = 42;
    vi.spyOn(Math, 'random').mockImplementation(() => {
      seed = (1664525 * seed + 1013904223) >>> 0;
      return seed / 2 ** 32;
    });
    for (const correct of [0, 3, 4, 7, 8, 40]) {
      const expectedLevel = Math.min(3, 1 + Math.floor(correct / 4));
      for (let i = 0; i < 100; i++) {
        const round = createShapeRound(correct);
        const targetId = shapeIdentity(round.target);
        const optionIds = round.options.map(shapeIdentity);
        expect(round.level).toEqual(expectedLevel);
        expect(round.options).toHaveLength(expectedLevel === 1 ? 3 : 4);
        expect(new Set(optionIds).size).toEqual(optionIds.length);
        expect(optionIds.filter((id) => id === targetId)).toHaveLength(1);
        expect(optionIds[round.correctIndex]).toEqual(targetId);
        expect(round.options.every((option) => option.length === round.target.length)).toEqual(true);
        expect(round.target).toHaveLength(expectedLevel + 3);
        if (expectedLevel > 1) expect(optionIds).toContain(shapeIdentity(mirrorShape(round.target)));
        for (const option of [round.target, ...round.options]) {
          expect(new Set(option.map(([x, y]) => `${x},${y}`)).size).toEqual(option.length);
          const reached = new Set([0]);
          for (let pass = 0; pass < option.length; pass++) {
            option.forEach(([x, y], index) => {
              if (option.some(([nx, ny], neighbor) => reached.has(neighbor) && Math.abs(x - nx) + Math.abs(y - ny) === 1)) reached.add(index);
            });
          }
          expect(reached.size).toEqual(option.length);
        }
      }
    }
  });

  it('rewards correct streaks and resets the streak without negative scores on a miss', () => {
    const first = scoreShapeAnswer(INITIAL_SHAPE_SCORE, true, 1);
    const second = scoreShapeAnswer(first, true, 1);
    const wrong = scoreShapeAnswer(second, false, 1);
    expect(first).toEqual({ score: 45, correct: 1, attempts: 1, streak: 1, bestStreak: 1 });
    expect(second.score - first.score).toBeGreaterThan(first.score);
    expect(wrong).toEqual({ score: 75, correct: 2, attempts: 3, streak: 0, bestStreak: 2 });
    expect(scoreShapeAnswer(INITIAL_SHAPE_SCORE, false, 1).score).toEqual(0);
    expect(INITIAL_SHAPE_SCORE.score).toEqual(0);
  });
});
