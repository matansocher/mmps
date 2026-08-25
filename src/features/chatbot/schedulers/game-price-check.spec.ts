import { describe, expect, it } from 'vitest';
import type { PsStorePrice } from '@services/playstation-store';
import type { GamePriceWatch } from '@shared/game-price-watcher';
import { buildPriceDropDigest } from './game-price-check';
import type { PriceDrop } from './game-price-check';

function buildWatch(overrides: Partial<GamePriceWatch> = {}): GamePriceWatch {
  return {
    chatId: 1,
    conceptId: '10000237',
    name: "Assassin's Creed Valhalla",
    url: 'https://store.playstation.com/en-il/concept/10000237',
    coverUrl: null,
    currency: 'ILS',
    basePrice: 28000,
    lowestPrice: 28000,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function buildPrice(overrides: Partial<PsStorePrice> = {}): PsStorePrice {
  return {
    basePrice: 'ILS\u00a0280.00',
    discountedPrice: 'ILS\u00a070.00',
    basePriceValue: 28000,
    discountedValue: 7000,
    currencyCode: 'ILS',
    discountText: '-75%',
    endsAt: null,
    isFree: false,
    ...overrides,
  };
}

function buildDrop(watch: Partial<GamePriceWatch> = {}, price: Partial<PsStorePrice> = {}): PriceDrop {
  return { watch: buildWatch(watch), price: buildPrice(price) };
}

describe('buildPriceDropDigest()', () => {
  it('should render the game as a link to its store page', () => {
    const message = buildPriceDropDigest([buildDrop()]);
    expect(message).toContain("[Assassin's Creed Valhalla](https://store.playstation.com/en-il/concept/10000237)");
  });

  it('should show the previous low, the new price and the discount', () => {
    const message = buildPriceDropDigest([buildDrop()]);
    expect(message).toContain('ILS 280.00 → *ILS 70.00* (-75%)');
  });

  it('should use a singular header for one drop', () => {
    expect(buildPriceDropDigest([buildDrop()])).toContain('💸 *Price drop on a game you are watching*');
  });

  it('should use a plural header for several drops', () => {
    const message = buildPriceDropDigest([buildDrop(), buildDrop({ conceptId: '10001222', name: 'Flying Soldiers' })]);
    expect(message).toContain('💸 *Price drops on games you are watching*');
  });

  it('should include the sale end date when the discount expires', () => {
    const message = buildPriceDropDigest([buildDrop({}, { endsAt: new Date('2026-01-05T12:00:00Z') })]);
    expect(message).toContain('sale ends Jan 5, 2026');
  });

  it('should omit the sale end date when there is none', () => {
    expect(buildPriceDropDigest([buildDrop()])).not.toContain('sale ends');
  });

  it('should sort the deepest discount first', () => {
    const message = buildPriceDropDigest([
      buildDrop({ conceptId: '1', name: 'Small Discount' }, { basePriceValue: 10000, discountedValue: 9000 }),
      buildDrop({ conceptId: '2', name: 'Big Discount' }, { basePriceValue: 10000, discountedValue: 2000 }),
    ]);
    expect(message.indexOf('Big Discount')).toBeLessThan(message.indexOf('Small Discount'));
  });

  it('should omit the percentage when the new price is not below the full price', () => {
    const message = buildPriceDropDigest([buildDrop({ lowestPrice: 30000 }, { basePriceValue: 28000, discountedValue: 28000 })]);
    expect(message).toContain('ILS 300.00 → *ILS 280.00*');
    expect(message).not.toContain('(-');
  });

  it('should fall back to the stored currency when the store omits it', () => {
    const message = buildPriceDropDigest([buildDrop({ currency: 'ILS' }, { currencyCode: '' })]);
    expect(message).toContain('ILS 280.00 → *ILS 70.00*');
  });
});
