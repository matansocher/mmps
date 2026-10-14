import { EMPTY_GLOBE_PROGRESS, type GlobeProgress, mergeGlobeProgress, mergeGlobeSnapshots } from './globe-progress';

const progress = (overrides: Partial<GlobeProgress>): GlobeProgress => ({ ...EMPTY_GLOBE_PROGRESS, ...overrides });

describe('mergeGlobeProgress()', () => {
  test('should keep the larger counters and combine stamps, achievements and daily scores', () => {
    const phone = progress({ miles: 900, rounds: 12, stamps: { FR: 3, JP: 1 }, achievements: ['first-round', 'globetrotter'], daily: { '2026-01-01': 7 } });
    const desktop = progress({ miles: 100, rounds: 2, stamps: { FR: 1, BR: 2 }, achievements: ['first-round'], daily: { '2026-01-01': 9, '2026-01-02': 4 } });
    expect(mergeGlobeProgress(phone, desktop)).toEqual(
      progress({ miles: 900, rounds: 12, stamps: { FR: 3, JP: 1, BR: 2 }, achievements: ['first-round', 'globetrotter'], daily: { '2026-01-01': 9, '2026-01-02': 4 } }),
    );
  });

  test.each([
    { a: { streak: 5, lastDaily: '2026-01-03' }, b: { streak: 9, lastDaily: '2026-01-01' }, expected: { streak: 5, lastDaily: '2026-01-03' } },
    { a: { streak: 1, lastDaily: null }, b: { streak: 2, lastDaily: '2026-01-01' }, expected: { streak: 2, lastDaily: '2026-01-01' } },
    { a: { streak: 3, lastDaily: '2026-01-01' }, b: { streak: 4, lastDaily: '2026-01-01' }, expected: { streak: 4, lastDaily: '2026-01-01' } },
  ])('should take the streak from the most recent daily ($expected.lastDaily)', ({ a, b, expected }) => {
    const merged = mergeGlobeProgress(progress(a), progress(b));
    expect({ streak: merged.streak, lastDaily: merged.lastDaily }).toEqual(expected);
  });

  test('should be idempotent', () => {
    const p = progress({ miles: 10, rounds: 1, stamps: { FR: 1 }, achievements: ['a'], streak: 1, lastDaily: '2026-01-01', daily: { '2026-01-01': 5 } });
    expect(mergeGlobeProgress(p, p)).toEqual(p);
  });

  test('should keep only the latest 60 daily scores', () => {
    const daily = Object.fromEntries(Array.from({ length: 70 }, (_, i) => [`2026-${String(Math.floor(i / 28) + 1).padStart(2, '0')}-${String((i % 28) + 1).padStart(2, '0')}`, 1]));
    const merged = mergeGlobeProgress(progress({ daily }), EMPTY_GLOBE_PROGRESS);
    expect(Object.keys(merged.daily).length).toEqual(60);
    expect(Object.keys(merged.daily).sort()[0]).toEqual('2026-01-11');
  });
});

describe('mergeGlobeSnapshots()', () => {
  test('should keep the best score per mode', () => {
    const merged = mergeGlobeSnapshots(
      { progress: EMPTY_GLOBE_PROGRESS, bestScores: { 'best:classic': 7, 'best:continent:Europe': 4 } },
      { progress: EMPTY_GLOBE_PROGRESS, bestScores: { 'best:classic': 9, 'best:flags': 3 } },
    );
    expect(merged.bestScores).toEqual({ 'best:classic': 9, 'best:continent:Europe': 4, 'best:flags': 3 });
  });
});
