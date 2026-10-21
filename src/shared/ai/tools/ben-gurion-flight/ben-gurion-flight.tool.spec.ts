import type { BenGurionFlight } from '@services/ben-gurion-flights';
import { isLikelyShabbatGap, pickFlight, planFlightTrain } from './ben-gurion-flight.tool';

describe('planFlightTrain()', () => {
  test.each([
    {
      direction: 'departure' as const,
      flightTime: '2026-05-20T14:00',
      expected: { to: 'Ben Gurion Airport', arriveBy: true, date: '2026-05-20', time: '11:00' },
    },
    {
      direction: 'departure' as const,
      flightTime: '2026-05-20T01:30',
      expected: { to: 'Ben Gurion Airport', arriveBy: true, date: '2026-05-19', time: '22:30' },
    },
    {
      direction: 'arrival' as const,
      flightTime: '2026-05-20T23:30',
      expected: { from: 'Ben Gurion Airport', date: '2026-05-21', time: '00:30' },
    },
  ])('should plan the train for a $direction at $flightTime', ({ direction, flightTime, expected }) => {
    expect(planFlightTrain(direction, flightTime).trainSearch).toEqual(expected);
  });

  it('should use a custom buffer', () => {
    expect(planFlightTrain('departure', '2026-05-20T14:00', 120).trainSearch.time).toEqual('12:00');
  });
});

describe('isLikelyShabbatGap()', () => {
  test.each([
    { dateTime: '2026-05-22T15:00', expected: true },
    { dateTime: '2026-05-23T12:00', expected: true },
    { dateTime: '2026-05-23T22:00', expected: false },
    { dateTime: '2026-05-22T10:00', expected: false },
    { dateTime: '2026-05-20T15:00', expected: false },
  ])('should return $expected for $dateTime', ({ dateTime, expected }) => {
    expect(isLikelyShabbatGap(new Date(dateTime))).toEqual(expected);
  });
});

describe('pickFlight()', () => {
  const flight = (estimatedTime: string) => ({ estimatedTime }) as BenGurionFlight;
  const flights = [flight('2026-05-19T10:00'), flight('2026-05-20T10:00'), flight('2026-05-21T10:00')];

  test.each([
    { now: '2026-05-19T12:00', expected: '2026-05-20T10:00' },
    { now: '2026-05-18T12:00', expected: '2026-05-19T10:00' },
    { now: '2026-05-22T12:00', expected: '2026-05-21T10:00' },
  ])('should pick $expected when now is $now', ({ now, expected }) => {
    expect(pickFlight(flights, now).estimatedTime).toEqual(expected);
  });
});
