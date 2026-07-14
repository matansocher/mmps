import { describe, expect, it, test } from 'vitest';
import type { RoundResult } from '../types';
import { calculateRoundCoinReward } from './rewards';

function result(overrides: Partial<RoundResult> = {}): RoundResult {
  return {
    round: 1,
    guess: { lat: 32, lng: 35 },
    actual: { lat: 32, lng: 35 },
    distanceMeters: 0,
    circleRadiusKm: 25,
    circleHit: true,
    outsideDistanceMeters: 0,
    points: 3_000,
    locality: 'Tel Aviv',
    totalScore: 3_000,
    completed: false,
    ...overrides,
  };
}

describe('calculateRoundCoinReward()', () => {
  test.each([
    { radiusKm: 5, expectedPrecision: 15 },
    { radiusKm: 15, expectedPrecision: 10 },
    { radiusKm: 30, expectedPrecision: 5 },
    { radiusKm: 31, expectedPrecision: 0 },
  ])('awards $expectedPrecision precision coins for a $radiusKm km hit', ({ radiusKm, expectedPrecision }) => {
    expect(calculateRoundCoinReward(result({ circleRadiusKm: radiusKm }), false)).toEqual({
      completion: 0,
      circleHit: 5,
      precision: expectedPrecision,
      newStamp: 0,
      total: 5 + expectedPrecision,
    });
  });

  it('does not award hit or precision coins for a miss', () => {
    expect(calculateRoundCoinReward(result({ circleHit: false, circleRadiusKm: 5 }), false).total).toEqual(0);
  });

  it('adds ten coins for a new Passport stamp', () => {
    expect(calculateRoundCoinReward(result(), true).newStamp).toEqual(10);
  });
});
