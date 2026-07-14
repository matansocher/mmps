import { describe, expect, it } from 'vitest';
import { getCosmetic, getCosmeticPrice, getPassportMilestoneUnlocks, getWeeklyFeaturedCosmetic, resolveEquippedCosmetics, SHOP_COSMETICS } from './cosmetics';

describe('cosmetics economy', () => {
  it('contains twelve purchasable launch cosmetics', () => {
    expect(SHOP_COSMETICS).toHaveLength(12);
  });

  it('discounts the weekly featured cosmetic by twenty percent', () => {
    const date = new Date('2026-07-14T12:00:00Z');
    const featured = getWeeklyFeaturedCosmetic(date);
    expect(getCosmeticPrice(featured, date)).toEqual(Math.round(featured.price! * 0.8));
  });

  it('unlocks Passport rewards at 3, 6, 12, and 18 stamps', () => {
    expect(getPassportMilestoneUnlocks(2)).toHaveLength(0);
    expect(getPassportMilestoneUnlocks(3)).toHaveLength(1);
    expect(getPassportMilestoneUnlocks(18)).toHaveLength(4);
  });
});

describe('getCosmetic()', () => {
  it('returns a static cosmetic by id', () => {
    expect(getCosmetic('cover-coast')?.name).toEqual('Mediterranean Lines');
  });

  it('returns undefined for unknown ids', () => {
    expect(getCosmetic('does-not-exist')).toBeUndefined();
  });

  it('returns undefined for undefined input', () => {
    expect(getCosmetic(undefined)).toBeUndefined();
  });

  it('synthesizes a share-frame cosmetic for monthly light-up ids', () => {
    const cosmetic = getCosmetic('frame-light-up-2026-07');
    expect(cosmetic).toBeDefined();
    expect(cosmetic?.id).toEqual('frame-light-up-2026-07');
    expect(cosmetic?.category).toEqual('share-frame');
    expect(cosmetic?.name).toEqual('Light Up Israel');
  });
});

describe('resolveEquippedCosmetics()', () => {
  it('returns the equipped cosmetics unchanged when no preview', () => {
    const equipped = { 'map-theme': 'map-coast' } as const;
    expect(resolveEquippedCosmetics(equipped)).toEqual(equipped);
  });

  it('overlays the preview cosmetic in its category', () => {
    const equipped = { 'map-theme': 'map-coast' } as const;
    const result = resolveEquippedCosmetics(equipped, 'pin-sea');
    expect(result).toEqual({ 'map-theme': 'map-coast', pin: 'pin-sea' });
  });

  it('overrides an existing equipped cosmetic with the preview', () => {
    const equipped = { pin: 'pin-sun' } as const;
    const result = resolveEquippedCosmetics(equipped, 'pin-sea');
    expect(result.pin).toEqual('pin-sea');
  });

  it('ignores unknown preview ids', () => {
    const equipped = { 'map-theme': 'map-coast' } as const;
    expect(resolveEquippedCosmetics(equipped, 'does-not-exist')).toEqual(equipped);
  });
});
