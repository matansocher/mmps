import type { Game } from '../types';
import { buildSlots, HOUR_MS, isInSlot } from './heatmap';

function game(startTime: string, status: Game['status'] = 'scheduled'): Game {
  return { id: 1, startTime, status, events: [] } as unknown as Game;
}

describe('isInSlot()', () => {
  const slot = new Date('2025-05-10T19:00:00Z').getTime();

  test.each([
    { start: '2025-05-10T19:30:00Z', expected: true },
    { start: '2025-05-10T17:30:00Z', expected: true },
    { start: '2025-05-10T17:00:00Z', expected: false },
    { start: '2025-05-10T20:00:00Z', expected: false },
  ])('should return $expected for a game starting at $start', ({ start, expected }) => {
    expect(isInSlot(game(start), slot)).toEqual(expected);
  });
});

describe('buildSlots()', () => {
  test('should return no slots without games', () => {
    expect(buildSlots([])).toEqual([]);
  });

  test('should cover every hour a game is running and count live games', () => {
    const slots = buildSlots([game('2025-05-10T17:30:00Z', 'live'), game('2025-05-10T19:00:00Z')]);
    const first = new Date('2025-05-10T17:30:00Z');
    first.setMinutes(0, 0, 0);
    expect(slots.map((s) => [s.start - first.getTime(), s.games, s.live])).toEqual([
      [0, 1, 1],
      [HOUR_MS, 1, 1],
      [2 * HOUR_MS, 2, 1],
      [3 * HOUR_MS, 1, 0],
    ]);
  });
});
