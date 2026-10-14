import { describe, expect, it } from 'vitest';
import { isArray, readJson, writeJson } from './storage';

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

describe('storage', () => {
  it('round-trips namespaced JSON', () => {
    const store = memoryStorage();
    expect(writeJson('items', [1, 2], store)).toEqual(true);
    expect(store.getItem('earth:v1:items')).toEqual('[1,2]');
    expect(readJson('items', [], isArray, store)).toEqual([1, 2]);
  });

  it('falls back on corrupted or invalid data', () => {
    const store = memoryStorage();
    store.setItem('earth:v1:items', '{not json');
    expect(readJson('items', ['fallback'], isArray, store)).toEqual(['fallback']);
    store.setItem('earth:v1:items', '{"a":1}');
    expect(readJson('items', ['fallback'], isArray, store)).toEqual(['fallback']);
  });
});
