import { parseGlobeEvent, parseGlobeSnapshot } from './dto';

describe('parseGlobeEvent()', () => {
  test.each([
    { body: { event: 'opened' }, expected: { event: 'opened' } },
    { body: { event: 'round_started', mode: 'Europe sprint' }, expected: { event: 'round_started', mode: 'Europe sprint' } },
    { body: { event: 'round_finished', mode: 'Classic', score: 8, outOf: 10 }, expected: { event: 'round_finished', mode: 'Classic', score: 8, outOf: 10 } },
  ])('should accept $body.event', ({ body, expected }) => {
    expect(parseGlobeEvent(body)).toEqual(expected);
  });

  test.each([
    { body: null },
    { body: { event: 'hacked' } },
    { body: { event: 'round_started' } },
    { body: { event: 'round_started', mode: 'x'.repeat(61) } },
    { body: { event: 'round_finished', mode: 'Classic', score: 1.5, outOf: 10 } },
  ])('should reject $body', ({ body }) => {
    expect(parseGlobeEvent(body)).toEqual(null);
  });
});

describe('parseGlobeSnapshot()', () => {
  const progress = { miles: 120, rounds: 3, stamps: { FR: 2 }, achievements: ['first-round'], streak: 1, lastDaily: '2026-01-01', daily: { '2026-01-01': 8 } };

  test('should accept a valid snapshot', () => {
    const body = { progress, bestScores: { 'best:classic': 8, 'best:daily:2026-01-01': 8 } };
    expect(parseGlobeSnapshot(body)).toEqual(body);
  });

  test.each([
    { body: null },
    { body: { progress } },
    { body: { progress: { ...progress, miles: -1 }, bestScores: {} } },
    { body: { progress: { ...progress, stamps: { 'a.b': 1 } }, bestScores: {} } },
    { body: { progress: { ...progress, lastDaily: 'yesterday' }, bestScores: {} } },
    { body: { progress, bestScores: { classic: 3 } } },
    { body: { progress, bestScores: { 'best:$where': 3 } } },
  ])('should reject $body', ({ body }) => {
    expect(parseGlobeSnapshot(body)).toEqual(null);
  });
});
