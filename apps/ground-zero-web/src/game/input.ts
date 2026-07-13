import type { Direction } from './types';

const KEY_DIRECTIONS: Readonly<Record<string, Direction>> = {
  ArrowUp: 'up',
  w: 'up',
  W: 'up',
  ArrowRight: 'right',
  d: 'right',
  D: 'right',
  ArrowDown: 'down',
  s: 'down',
  S: 'down',
  ArrowLeft: 'left',
  a: 'left',
  A: 'left',
};

export function directionForKey(key: string): Direction | null {
  return KEY_DIRECTIONS[key] ?? null;
}

export function directionForDelta(deltaX: number, deltaY: number): Direction | null {
  if (Math.max(Math.abs(deltaX), Math.abs(deltaY)) < 12) return null;
  if (Math.abs(deltaX) > Math.abs(deltaY)) return deltaX > 0 ? 'right' : 'left';
  return deltaY > 0 ? 'down' : 'up';
}
