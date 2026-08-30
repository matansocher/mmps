import { describe, expect, it } from 'vitest';
import type { PsStoreCache, PsStorePriceResponse } from '../types';
import { collectPriceObjects, extractConceptId, extractCoverUrl, extractDefaultProductId, extractEmbeddedCaches, extractGameName, extractProductName, selectStandalonePrice } from './extract-price';

function buildEnvScript(cache: PsStoreCache): string {
  return `<script id="env:abc123" type="application/json">${JSON.stringify({ args: {}, overrides: {}, cache })}</script>`;
}

function buildPrice(overrides: Partial<PsStorePriceResponse> = {}): PsStorePriceResponse {
  return {
    basePrice: 'ILS\u00a0280.00',
    discountedPrice: 'ILS\u00a0280.00',
    basePriceValue: 28000,
    discountedValue: 28000,
    currencyCode: 'ILS',
    displayDiscountText: null,
    endTime: null,
    isFree: false,
    serviceBranding: ['NONE'],
    ...overrides,
  } as PsStorePriceResponse;
}

const BASE_PRODUCT_ID = 'EP0001-PPSA01490_00-GAME000000000000';

function buildCache(prices: Record<string, PsStorePriceResponse>): PsStoreCache {
  return {
    'Concept:10000237': {
      __typename: 'Concept',
      id: '10000237',
      name: "Assassin's Creed Valhalla",
      defaultProduct: { __ref: `Product:${BASE_PRODUCT_ID}` },
    },
    ...Object.fromEntries(Object.entries(prices).map(([key, price]) => [key, { __typename: 'GameCTA', price }])),
  } as unknown as PsStoreCache;
}

describe('extractEmbeddedCaches()', () => {
  it('should collect the cache from every env script tag', () => {
    const html = `<html>${buildEnvScript({ a: { __typename: 'Concept' } } as unknown as PsStoreCache)}${buildEnvScript({ b: { __typename: 'Product' } } as unknown as PsStoreCache)}</html>`;
    expect(extractEmbeddedCaches(html)).toHaveLength(2);
  });

  it('should skip a malformed payload without discarding the valid ones', () => {
    const html = `<script id="env:bad" type="application/json">{not json</script>${buildEnvScript({ a: { __typename: 'Concept' } } as unknown as PsStoreCache)}`;
    expect(extractEmbeddedCaches(html)).toHaveLength(1);
  });

  it('should return an empty list when the page has no env scripts', () => {
    expect(extractEmbeddedCaches('<html><body>error shell</body></html>')).toEqual([]);
  });

  it('should ignore a script whose payload carries no cache', () => {
    const html = `<script id="env:empty" type="application/json">${JSON.stringify({ args: {} })}</script>`;
    expect(extractEmbeddedCaches(html)).toEqual([]);
  });
});

describe('extractDefaultProductId()', () => {
  it('should read the product id the concept points at', () => {
    expect(extractDefaultProductId([buildCache({})])).toEqual(BASE_PRODUCT_ID);
  });

  it('should return null when no concept declares a default product', () => {
    expect(extractDefaultProductId([{ 'Product:x': { __typename: 'Product', name: 'Game' } } as unknown as PsStoreCache])).toBeNull();
  });
});

describe('collectPriceObjects()', () => {
  it('should keep only the CTA prices belonging to the default product', () => {
    const cache = buildCache({
      [`GameCTA:ADD_TO_CART:${BASE_PRODUCT_ID}:OUTRIGHT`]: buildPrice(),
      'GameCTA:ADD_TO_CART:EP0001-PPSA01490_00-HELIXCREDITS0001:OUTRIGHT': buildPrice({ basePriceValue: 590, discountedValue: 590 }),
    });

    const prices = collectPriceObjects([cache], BASE_PRODUCT_ID);
    expect(prices).toHaveLength(1);
    expect(prices[0].discountedValue).toEqual(28000);
  });

  it('should keep every CTA price when no product id is given', () => {
    const cache = buildCache({
      [`GameCTA:ADD_TO_CART:${BASE_PRODUCT_ID}:OUTRIGHT`]: buildPrice(),
      'GameCTA:ADD_TO_CART:EP0001-PPSA01490_00-AVATARBUNDLE001:OUTRIGHT': buildPrice({ basePriceValue: 590, discountedValue: 590 }),
    });

    expect(collectPriceObjects([cache])).toHaveLength(2);
  });

  it('should not filter out non CTA entries', () => {
    const cache = {
      'Product:other': { __typename: 'Product', price: buildPrice({ basePriceValue: 100, discountedValue: 100 }) },
    } as unknown as PsStoreCache;

    expect(collectPriceObjects([cache], BASE_PRODUCT_ID)).toHaveLength(1);
  });
});

describe('selectStandalonePrice()', () => {
  it('should return the standalone price of a full price game', () => {
    const price = selectStandalonePrice([buildPrice()]);
    expect(price).toMatchObject({ basePriceValue: 28000, discountedValue: 28000, currencyCode: 'ILS', endsAt: null });
  });

  it('should pick the cheapest standalone price across editions', () => {
    const price = selectStandalonePrice([buildPrice({ basePriceValue: 28000, discountedValue: 28000 }), buildPrice({ basePriceValue: 39000, discountedValue: 19500 })]);
    expect(price?.discountedValue).toEqual(19500);
  });

  it('should parse a discount end time given as an epoch string', () => {
    const price = selectStandalonePrice([buildPrice({ discountedValue: 7000, displayDiscountText: ' -75% ', endTime: '1767225600000' })]);
    expect(price?.endsAt).toEqual(new Date(1767225600000));
    expect(price?.discountText).toEqual('-75%');
  });

  it('should return null when the only prices are subscription included', () => {
    const prices = [buildPrice({ serviceBranding: ['PS_PLUS'], discountedValue: 0, isFree: true }), buildPrice({ serviceBranding: ['UBISOFT_PLUS'], discountedValue: 0, isFree: true })];
    expect(selectStandalonePrice(prices)).toBeNull();
  });

  it('should ignore a free standalone entry so it is not read as a drop to zero', () => {
    expect(selectStandalonePrice([buildPrice({ discountedValue: 0, isFree: true })])).toBeNull();
  });

  it('should ignore an entry with no service branding', () => {
    expect(selectStandalonePrice([buildPrice({ serviceBranding: [] })])).toBeNull();
  });

  it('should return null for an empty list', () => {
    expect(selectStandalonePrice([])).toBeNull();
  });
});

describe('extractGameName()', () => {
  it('should prefer the concept name', () => {
    expect(extractGameName([buildCache({})])).toEqual("Assassin's Creed Valhalla");
  });

  it('should fall back to the product name', () => {
    const cache = { 'Product:x': { __typename: 'Product', name: 'Square Keeper' } } as unknown as PsStoreCache;
    expect(extractGameName([cache])).toEqual('Square Keeper');
  });

  it('should return null when neither is present', () => {
    expect(extractGameName([{} as PsStoreCache])).toBeNull();
  });
});

describe('extractProductName()', () => {
  it('should read the name of the exact edition rather than the franchise concept', () => {
    const cache = {
      'Concept:10001130': { __typename: 'Concept', id: '10001130', name: 'Call of Duty®' },
      'Product:EP0002-PPSA07950_00-CODMW4STANDARD01': { __typename: 'Product', name: 'Call of Duty®: Modern Warfare® 4' },
    } as unknown as PsStoreCache;
    expect(extractProductName([cache], 'EP0002-PPSA07950_00-CODMW4STANDARD01')).toEqual('Call of Duty®: Modern Warfare® 4');
  });

  it('should return null when the product is not on the page', () => {
    expect(extractProductName([buildCache({})], 'EP0002-PPSA07950_00-UNKNOWN0000000001')).toBeNull();
  });
});

describe('extractConceptId()', () => {
  it('should read the id off the concept entry', () => {
    expect(extractConceptId([buildCache({})])).toEqual('10000237');
  });

  it('should fall back to the concept cache key on a product page', () => {
    const cache = { 'Concept:10005190:en-il': { __typename: 'ConceptRetrieve' } } as unknown as PsStoreCache;
    expect(extractConceptId([cache])).toEqual('10005190');
  });

  it('should return null when the page references no concept', () => {
    expect(extractConceptId([{ 'Product:x': { __typename: 'Product' } } as unknown as PsStoreCache])).toBeNull();
  });
});

describe('extractCoverUrl()', () => {
  it('should prefer the master image', () => {
    const cache = {
      a: {
        media: [
          { type: 'IMAGE', role: 'SCREENSHOT', url: 'https://img/shot.png' },
          { type: 'IMAGE', role: 'MASTER', url: 'https://img/master.png' },
        ],
      },
    } as unknown as PsStoreCache;
    expect(extractCoverUrl([cache])).toEqual('https://img/master.png');
  });

  it('should fall back to the gamehub cover art', () => {
    const cache = {
      a: {
        media: [
          { type: 'IMAGE', role: 'SCREENSHOT', url: 'https://img/shot.png' },
          { type: 'IMAGE', role: 'GAMEHUB_COVER_ART', url: 'https://img/cover.png' },
        ],
      },
    } as unknown as PsStoreCache;
    expect(extractCoverUrl([cache])).toEqual('https://img/cover.png');
  });

  it('should return null when the page has no images', () => {
    expect(extractCoverUrl([buildCache({})])).toBeNull();
  });
});
