import { afterEach, describe, expect, it, vi } from 'vitest';
import { makeMathProblem, nextMathLevel } from './quick-math.logic';

afterEach(() => vi.restoreAllMocks());

describe('nextMathLevel', () => {
  it.each([
    { level: 0, streak: 1, correct: true, expected: 0 },
    { level: 0, streak: 2, correct: true, expected: 1 },
    { level: 1, streak: 3, correct: true, expected: 1 },
    { level: 1, streak: 4, correct: true, expected: 2 },
    { level: 12, streak: 26, correct: true, expected: 13 },
    { level: 4, streak: 0, correct: false, expected: 3 },
    { level: 0, streak: 0, correct: false, expected: 0 },
  ])('advances $level to $expected at streak $streak (correct: $correct)', ({ level, streak, correct, expected }) => {
    expect(nextMathLevel(level, streak, correct)).toEqual(expected);
  });

  it('keeps levels and rewards advancing beyond the original ceiling', () => {
    let level = 0;
    for (let streak = 1; streak <= 40; streak += 1) {
      level = nextMathLevel(level, streak, true);
      expect(level).toEqual(Math.floor(streak / 2));
      expect(makeMathProblem(level).reward).toEqual(10 + level * 5);
    }
  });
});

describe('makeMathProblem', () => {
  it.each([0, 1, 2, 3, 4, 8, 12, 20, 100])('generates correct, unique choices at level %i even with repeated random values', (level) => {
    const random = vi.spyOn(Math, 'random');
    for (const sample of [0, 0.26, 0.51, 0.76, 0.999]) {
      random.mockReturnValue(sample);
      const problem = makeMathProblem(level);
      const [left, op, right, , extra] = problem.text.replace(/[()]/g, '').split(' ');
      const a = Number(left);
      const b = Number(right);
      const first = op === '+' ? a + b : op === '−' ? a - b : op === '×' ? a * b : a / b;
      const calculated = problem.text.startsWith('(') ? first * Number(extra) : extra ? first + Number(extra) : first;
      expect(problem.answer).toEqual(calculated);
      expect(problem.options).toHaveLength(4);
      expect(new Set(problem.options).size).toEqual(4);
      expect(problem.options.filter((value) => value === calculated)).toHaveLength(1);
      expect(problem.options.every((value) => Number.isInteger(value) && value >= 0)).toEqual(true);
      if (level < 2) expect(['+', '−']).toContain(op);
      if (level < 4) expect(op).not.toEqual('÷');
      if (level >= 8) expect(problem.text.split(' ')).toHaveLength(5);
      expect(problem.answer).toBeLessThan(2000);
    }
  });
});
