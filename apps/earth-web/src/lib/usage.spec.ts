import { describe, expect, it, test } from 'vitest';
import { writeJson } from './storage';
import { addUsage, classifyUrl, emptyCounts, estimateCost, monthKey, readUsage } from './usage';

function memoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    getItem: (k) => map.get(k) ?? null,
    key: (i) => [...map.keys()][i] ?? null,
    removeItem: (k) => void map.delete(k),
    setItem: (k, v) => void map.set(k, v),
  };
}

describe('classifyUrl()', () => {
  test.each([
    { url: 'https://tile.googleapis.com/v1/3dtiles/root.json?key=abc', expected: 'tiles3d' },
    { url: 'https://tile.googleapis.com/v1/3dtiles/datasets/xyz/files/abc.glb?session=s&key=k', expected: null },
    { url: 'https://tile.googleapis.com/v1/2dtiles/4/8/5?session=s&key=k', expected: 'tiles2d' },
    { url: 'https://tile.googleapis.com/v1/createSession?key=k', expected: null },
    { url: 'https://tile.googleapis.com/v1/2dtiles/viewport?zoom=3', expected: null },
    { url: 'https://example.com/v1/3dtiles/root.json', expected: null },
    { url: 'not a url', expected: null },
  ])('classifies $url as $expected', ({ url, expected }) => {
    expect(classifyUrl(url)).toEqual(expected);
  });
});

describe('estimateCost()', () => {
  it('is free within the monthly caps', () => {
    expect(estimateCost({ tiles3d: 1000, tiles2d: 100_000, autocomplete: 10_000, placeDetails: 5000 }).total).toEqual(0);
  });

  it('charges only what exceeds the free cap', () => {
    const { items, total } = estimateCost({ ...emptyCounts(), tiles3d: 1500, placeDetails: 6000 });
    expect(items.find((i) => i.sku.id === 'tiles3d')?.cost).toBeCloseTo(3);
    expect(items.find((i) => i.sku.id === 'placeDetails')?.cost).toBeCloseTo(17);
    expect(total).toBeCloseTo(20);
  });
});

describe('monthly usage', () => {
  const june = new Date(2025, 5, 15);
  const july = new Date(2025, 6, 1);

  it('formats the month key', () => {
    expect(monthKey(june)).toEqual('2025-06');
  });

  it('adds deltas and never goes below zero', () => {
    const usage = addUsage({ month: '2025-06', counts: { ...emptyCounts(), autocomplete: 2 } }, { autocomplete: -5, tiles2d: 3 }, june);
    expect(usage.counts).toEqual({ ...emptyCounts(), tiles2d: 3 });
  });

  it('starts a new month from zero', () => {
    const usage = addUsage({ month: '2025-06', counts: { ...emptyCounts(), tiles3d: 9 } }, { tiles3d: 1 }, july);
    expect(usage).toEqual({ month: '2025-07', counts: { ...emptyCounts(), tiles3d: 1 } });
  });

  it('ignores stored usage from a previous month or with a bad shape', () => {
    const store = memoryStorage();
    writeJson('usage', { month: '2025-06', counts: { ...emptyCounts(), tiles3d: 4 } }, store);
    expect(readUsage(june, store).counts.tiles3d).toEqual(4);
    expect(readUsage(july, store).counts.tiles3d).toEqual(0);
    writeJson('usage', { month: '2025-06', counts: { tiles3d: 'x' } }, store);
    expect(readUsage(june, store).counts).toEqual(emptyCounts());
  });
});
