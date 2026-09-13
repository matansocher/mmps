import { describe, expect, test } from 'vitest';
import { parsePsStoreUrl } from './parse-ps-store-url';

describe('parsePsStoreUrl()', () => {
  test.each([
    { url: 'https://store.playstation.com/en-il/concept/10000237', expected: { kind: 'concept', id: '10000237' } },
    { url: 'https://store.playstation.com/en-us/concept/10005190/', expected: { kind: 'concept', id: '10005190' } },
    { url: 'https://store.playstation.com/en-il/concept/10000237?smcid=share', expected: { kind: 'concept', id: '10000237' } },
    { url: '  https://store.playstation.com/en-il/concept/10000237  ', expected: { kind: 'concept', id: '10000237' } },
    { url: 'https://store.playstation.com/en-us/product/UP3252-PPSA07893_00-JANDUSOFT0000001', expected: { kind: 'product', id: 'UP3252-PPSA07893_00-JANDUSOFT0000001' } },
    { url: 'https://www.playstation.com/en-il/concept/10000237', expected: { kind: 'concept', id: '10000237' } },
  ])('should parse $url', ({ url, expected }) => {
    expect(parsePsStoreUrl(url)).toEqual(expected);
  });

  test.each([
    { label: 'a non playstation host', url: 'https://store.xbox.com/en-il/concept/10000237' },
    { label: 'a lookalike host', url: 'https://notplaystation.com/en-il/concept/10000237' },
    { label: 'a store page with no game path', url: 'https://store.playstation.com/en-il/pages/deals' },
    { label: 'a non numeric concept id', url: 'https://store.playstation.com/en-il/concept/abc' },
    { label: 'a plain string', url: 'assassins creed valhalla' },
    { label: 'an empty string', url: '' },
  ])('should return null for $label', ({ url }) => {
    expect(parsePsStoreUrl(url)).toBeNull();
  });
});
