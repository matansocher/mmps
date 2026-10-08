import { parseGlobeEvent } from './dto';

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
