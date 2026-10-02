import { describe, expect, test } from 'vitest';
import { formatClock } from './format';

describe('formatClock()', () => {
  test.each([
    { ms: 60_000, expected: '1:00' },
    { ms: 59_001, expected: '1:00' },
    { ms: 9_500, expected: '0:10' },
    { ms: 0, expected: '0:00' },
  ])('should return $expected for $ms ms', ({ ms, expected }) => {
    expect(formatClock(ms)).toEqual(expected);
  });
});
