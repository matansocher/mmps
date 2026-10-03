import { describe, expect, it, test } from 'vitest';
import { applyRound, currentStreak, dailyRandom, EMPTY_PROGRESS, flightNumber, isProgress, milesFor, NEW_STAMP_BONUS, PERFECT_BONUS, previousDay, type Progress, tierFor } from './progression';

const CONTINENT: Record<string, string> = { FR: 'Europe', DE: 'Europe', KE: 'Africa', JP: 'Asia', BR: 'South America', US: 'North America', AU: 'Oceania' };
const continentOf = (code: string) => CONTINENT[code];

describe('tierFor()', () => {
  test.each([
    { miles: 0, tier: 'Economy', next: 'Premium' },
    { miles: 1_499, tier: 'Economy', next: 'Premium' },
    { miles: 1_500, tier: 'Premium', next: 'Business' },
    { miles: 30_000, tier: 'Captain', next: null },
  ])('should be $tier at $miles miles', ({ miles, tier, next }) => {
    const result = tierFor(miles);
    expect(result.tier.name).toEqual(tier);
    expect(result.next?.name ?? null).toEqual(next);
  });

  it('should report progress towards the next tier', () => {
    expect(tierFor(750).progress).toEqual(0.5);
    expect(tierFor(99_999).progress).toEqual(1);
  });
});

describe('previousDay()', () => {
  test.each([
    { day: '2026-03-10', expected: '2026-03-09' },
    { day: '2026-03-01', expected: '2026-02-28' },
    { day: '2026-01-01', expected: '2025-12-31' },
  ])('should return $expected before $day', ({ day, expected }) => {
    expect(previousDay(day)).toEqual(expected);
  });
});

describe('dailyRandom()', () => {
  it('should give the same sequence for the same day', () => {
    const a = dailyRandom('2026-05-01');
    const b = dailyRandom('2026-05-01');
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });

  it('should give different sequences on different days', () => {
    expect(dailyRandom('2026-05-01')()).not.toEqual(dailyRandom('2026-05-02')());
  });

  it('should stay within [0, 1)', () => {
    const random = dailyRandom('2026-05-01');
    for (let i = 0; i < 200; i++) {
      const value = random();
      expect(value >= 0 && value < 1).toEqual(true);
    }
  });
});

describe('flightNumber()', () => {
  it('should count days from launch', () => {
    expect(flightNumber('2026-01-01')).toEqual(1);
    expect(flightNumber('2026-02-01')).toEqual(32);
  });
});

describe('milesFor()', () => {
  test.each([
    { round: { kind: 'classic', score: 7, outOf: 10, found: [] }, expected: 700 },
    { round: { kind: 'classic', score: 10, outOf: 10, found: [] }, expected: 1_000 + PERFECT_BONUS },
    { round: { kind: 'daily', score: 4, outOf: 10, found: [] }, expected: 600 },
    { round: { kind: 'classic', score: 0, outOf: 10, found: [] }, expected: 0 },
  ] as const)('should award $expected for $round.kind $round.score', ({ round, expected }) => {
    expect(milesFor(round)).toEqual(expected);
  });
});

describe('applyRound()', () => {
  it('should add miles, stamps and the first achievement', () => {
    const outcome = applyRound(EMPTY_PROGRESS, { kind: 'classic', score: 2, outOf: 10, found: ['FR', 'KE'] }, '2026-05-01', continentOf);
    expect(outcome.earned).toEqual(200 + 2 * NEW_STAMP_BONUS);
    expect(outcome.newStamps).toEqual(['FR', 'KE']);
    expect(outcome.progress.stamps).toEqual({ FR: 1, KE: 1 });
    expect(outcome.progress.rounds).toEqual(1);
    expect(outcome.unlocked.map((a) => a.id)).toEqual(['first-flight']);
  });

  it('should only give the new-stamp bonus once per country', () => {
    const first = applyRound(EMPTY_PROGRESS, { kind: 'classic', score: 1, outOf: 10, found: ['FR'] }, '2026-05-01', continentOf);
    const second = applyRound(first.progress, { kind: 'classic', score: 1, outOf: 10, found: ['FR'] }, '2026-05-01', continentOf);
    expect(second.newStamps).toEqual([]);
    expect(second.earned).toEqual(100);
    expect(second.progress.stamps.FR).toEqual(2);
    expect(second.unlocked).toEqual([]);
  });

  it('should report a tier upgrade', () => {
    const progress: Progress = { ...EMPTY_PROGRESS, miles: 1_400 };
    expect(applyRound(progress, { kind: 'classic', score: 1, outOf: 10, found: [] }, '2026-05-01', continentOf).tierUp?.name).toEqual('Premium');
  });

  it('should unlock six continents', () => {
    const outcome = applyRound(EMPTY_PROGRESS, { kind: 'classic', score: 6, outOf: 10, found: ['FR', 'KE', 'JP', 'BR', 'US', 'AU'] }, '2026-05-01', continentOf);
    expect(outcome.unlocked.map((a) => a.id)).toContain('six-continents');
  });

  it('should unlock a perfect landing', () => {
    const classic = applyRound(EMPTY_PROGRESS, { kind: 'classic', score: 10, outOf: 10, found: [] }, '2026-05-01', continentOf);
    expect(classic.unlocked.map((a) => a.id)).toContain('perfect-landing');
  });

  describe('daily streak', () => {
    const daily = (progress: Progress, day: string, score = 5) => applyRound(progress, { kind: 'daily', score, outOf: 10, found: [] }, day, continentOf).progress;

    it('should start, extend and reset the streak', () => {
      let progress = daily(EMPTY_PROGRESS, '2026-05-01');
      expect(progress.streak).toEqual(1);
      progress = daily(progress, '2026-05-02');
      progress = daily(progress, '2026-05-03');
      expect(progress.streak).toEqual(3);
      expect(progress.achievements).toContain('commuter');
      progress = daily(progress, '2026-05-05');
      expect(progress.streak).toEqual(1);
      expect(progress.daily).toEqual({ '2026-05-01': 5, '2026-05-02': 5, '2026-05-03': 5, '2026-05-05': 5 });
    });

    it('should count only the first daily flight of a day', () => {
      const once = daily(EMPTY_PROGRESS, '2026-05-01', 3);
      const twice = daily(once, '2026-05-01', 9);
      expect(twice.streak).toEqual(1);
      expect(twice.daily['2026-05-01']).toEqual(3);
    });

    it('should leave the streak alone for other modes', () => {
      const progress = applyRound({ ...EMPTY_PROGRESS, streak: 4, lastDaily: '2026-05-01' }, { kind: 'classic', score: 1, outOf: 10, found: [] }, '2026-05-02', continentOf).progress;
      expect(progress.streak).toEqual(4);
    });
  });
});

describe('currentStreak()', () => {
  test.each([
    { lastDaily: '2026-05-03', expected: 4 },
    { lastDaily: '2026-05-02', expected: 4 },
    { lastDaily: '2026-05-01', expected: 0 },
    { lastDaily: null, expected: 0 },
  ])('should be $expected when the last daily flight was $lastDaily', ({ lastDaily, expected }) => {
    expect(currentStreak({ ...EMPTY_PROGRESS, streak: 4, lastDaily }, '2026-05-03')).toEqual(expected);
  });
});

describe('isProgress()', () => {
  it('should accept saved progress and reject junk', () => {
    expect(isProgress(EMPTY_PROGRESS)).toEqual(true);
    expect(isProgress({ ...EMPTY_PROGRESS, stamps: { FR: 'x' } })).toEqual(false);
    expect(isProgress({ miles: 5 })).toEqual(false);
    expect(isProgress(null)).toEqual(false);
  });
});
