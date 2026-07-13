import { describe, expect, it } from 'vitest';
import { directionForDelta, directionForKey } from './input';

describe('game input', () => {
  it.each([
    ['ArrowUp', 'up'],
    ['d', 'right'],
    ['S', 'down'],
    ['a', 'left'],
  ])('maps %s to %s', (key, expected) => {
    expect(directionForKey(key)).toEqual(expected);
  });

  it('uses the dominant swipe axis', () => {
    expect(directionForDelta(50, 10)).toEqual('right');
    expect(directionForDelta(-4, -40)).toEqual('up');
    expect(directionForDelta(5, 5)).toEqual(null);
  });
});
