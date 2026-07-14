import { describe, expect, it } from 'vitest';
import type { PlayerProfile } from '../types';
import { getWeekKey } from './cosmetics';
import { isWeeklyPreviewAvailable } from './storage';

function makeProfile(overrides: Partial<PlayerProfile> = {}): PlayerProfile {
  return {
    displayName: 'Test Navigator',
    avatarId: 'navigator-coast',
    level: 1,
    title: 'Newcomer',
    xp: 0,
    xpForNextLevel: 100,
    coins: 0,
    bestScore: 0,
    gamesPlayed: 0,
    passportStamps: [],
    localityMastery: [],
    ownedCosmeticIds: [],
    equippedCosmetics: {},
    currentDailyStreak: 0,
    bestDailyStreak: 0,
    badges: [],
    crownTier: 'none',
    monthlyProgress: { litCount: 0, totalLocalities: 18, litLocalities: [], earned: false },
    ...overrides,
  };
}

describe('isWeeklyPreviewAvailable()', () => {
  it('returns true when no preview is active and none used this week', () => {
    expect(isWeeklyPreviewAvailable(makeProfile())).toEqual(true);
  });

  it('returns false when a preview is already queued', () => {
    expect(isWeeklyPreviewAvailable(makeProfile({ previewCosmeticId: 'map-coast' }))).toEqual(false);
  });

  it('returns false when the preview was already used this week', () => {
    expect(isWeeklyPreviewAvailable(makeProfile({ previewUsedWeekKey: getWeekKey() }))).toEqual(false);
  });

  it('returns true when preview was used in a different week', () => {
    expect(isWeeklyPreviewAvailable(makeProfile({ previewUsedWeekKey: '2020-01-06' }))).toEqual(true);
  });
});
