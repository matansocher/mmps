import { afterEach, describe, expect, it, vi } from 'vitest';
import { getGamePrice, getGamePriceFromProduct } from './api';
import type { PsStoreCache, PsStorePriceResponse } from './types';

const CONCEPT_ID = '10001130';
const STANDARD_PRODUCT_ID = 'EP0002-PPSA07950_00-CODMW4STANDARD01';
const BETA_PRODUCT_ID = 'EP0002-PPSA37414_00-CODMW4BETA000001';

function buildPrice(overrides: Partial<PsStorePriceResponse> = {}): PsStorePriceResponse {
  return {
    basePrice: 'ILS\u00a0319.00',
    discountedPrice: 'ILS\u00a0319.00',
    basePriceValue: 31900,
    discountedValue: 31900,
    currencyCode: 'ILS',
    displayDiscountText: null,
    endTime: null,
    isFree: false,
    serviceBranding: ['NONE'],
    ...overrides,
  } as PsStorePriceResponse;
}

function buildHtml(cache: PsStoreCache): string {
  return `<html><script id="env:store" type="application/json">${JSON.stringify({ cache })}</script></html>`;
}

// A franchise umbrella concept (Call of Duty) whose default product is the free beta, alongside the
// paid pre-order standard edition — the exact shape that used to read as "no standalone price".
function buildStorePage(): string {
  const cache = {
    [`Concept:${CONCEPT_ID}`]: {
      __typename: 'Concept',
      id: CONCEPT_ID,
      name: 'Call of Duty®',
      defaultProduct: { __ref: `Product:${BETA_PRODUCT_ID}` },
    },
    [`Product:${STANDARD_PRODUCT_ID}`]: { __typename: 'Product', id: STANDARD_PRODUCT_ID, name: 'Call of Duty®: Modern Warfare® 4' },
    [`Product:${BETA_PRODUCT_ID}`]: { __typename: 'Product', id: BETA_PRODUCT_ID, name: 'Call of Duty®: Modern Warfare® 4 - Beta' },
    [`GameCTA:PREORDER:BUY_NOW:${STANDARD_PRODUCT_ID}-E002:OUTRIGHT`]: { __typename: 'GameCTA', price: buildPrice() },
    [`GameCTA:DOWNLOAD:BACKGROUND_PURCHASE_AND_DOWNLOAD:${BETA_PRODUCT_ID}-E004`]: {
      __typename: 'GameCTA',
      price: buildPrice({ basePrice: 'Free', discountedPrice: 'Free', basePriceValue: 0, discountedValue: 0, isFree: true }),
    },
  } as unknown as PsStoreCache;
  return buildHtml(cache);
}

function mockFetchHtml(html: string): void {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(html, { status: 200 }));
}

describe('getGamePriceFromProduct()', () => {
  afterEach(() => vi.restoreAllMocks());

  it('should read the pre-order price of the exact edition rather than the concept default product', async () => {
    mockFetchHtml(buildStorePage());

    const game = await getGamePriceFromProduct(STANDARD_PRODUCT_ID);

    expect(game).not.toBeNull();
    expect(game?.conceptId).toBe(CONCEPT_ID);
    expect(game?.productId).toBe(STANDARD_PRODUCT_ID);
    expect(game?.name).toBe('Call of Duty®: Modern Warfare® 4');
    expect(game?.price.discountedValue).toBe(31900);
  });

  it('should return null when the product has no standalone price', async () => {
    mockFetchHtml(buildStorePage());

    const game = await getGamePriceFromProduct(BETA_PRODUCT_ID);

    expect(game).toBeNull();
  });
});

describe('getGamePrice()', () => {
  afterEach(() => vi.restoreAllMocks());

  it('should read the price of a specific product when a productId is given', async () => {
    mockFetchHtml(buildStorePage());

    const game = await getGamePrice(CONCEPT_ID, { productId: STANDARD_PRODUCT_ID });

    expect(game?.productId).toBe(STANDARD_PRODUCT_ID);
    expect(game?.price.discountedValue).toBe(31900);
  });

  it('should return null when the concept default product has no standalone price', async () => {
    mockFetchHtml(buildStorePage());

    const game = await getGamePrice(CONCEPT_ID);

    expect(game).toBeNull();
  });
});
