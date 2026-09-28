import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({ sync: vi.fn() }));
vi.mock('./analytics', () => ({ track: vi.fn() }));
vi.mock('./api', () => ({ hasRemoteIdentity: () => true, mindloopApi: api }));
function storage() {
  const map = new Map<string, string>();
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => map.set(key, String(value)),
    removeItem: (key: string) => map.delete(key),
    clear: () => map.clear(),
  };
}
beforeEach(() => {
  vi.resetModules();
  vi.useFakeTimers();
  api.sync.mockReset();
  vi.stubGlobal('localStorage', storage());
  vi.stubGlobal('window', Object.assign(new EventTarget(), { setTimeout, clearTimeout }));
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
const empty = { bestScores: {}, favorites: [], history: [], updatedAt: null };
describe('snapshot sync', () => {
  it('preserves a run finished while an older server snapshot is in flight and flushes it', async () => {
    let resolve!: (value: unknown) => void;
    api.sync.mockImplementationOnce(
      () =>
        new Promise((r) => {
          resolve = r;
        }),
    );
    api.sync.mockImplementation(async (snapshot) => ({ player: { ...snapshot, updatedAt: null } }));
    const sync = await import('./player-sync');
    const history = await import('./history');
    const pending = sync.initPlayerSync();
    await history.recordPlay({ runId: 'new-run', gameId: 'grid-recall', score: 40, at: '2026-09-28T01:00:00Z', day: '2026-09-28', mode: 'classic', version: 2 });
    sync.syncResult();
    resolve({ player: empty });
    await pending;
    expect(history.getTotalPlays()).toBe(1);
    expect(history.getHistory()[0].runId).toBe('new-run');
    expect(sync.getSyncState()).toBe('pending');
    await vi.advanceTimersByTimeAsync(100);
    expect(api.sync).toHaveBeenCalledTimes(2);
    expect(sync.getSyncState()).toBe('saved');
    expect(history.getTotalPlays()).toBe(1);
  });
  it('keeps a favorite removal made during synchronization', async () => {
    let resolve!: (value: unknown) => void;
    api.sync.mockImplementationOnce(
      () =>
        new Promise((r) => {
          resolve = r;
        }),
    );
    const sync = await import('./player-sync');
    const pending = sync.initPlayerSync();
    localStorage.setItem('mindloop:favorites', '[]');
    localStorage.setItem('mindloop:favorites-at', JSON.stringify('2026-09-28T02:00:00Z'));
    resolve({ player: { ...empty, favorites: ['grid-recall'], favoritesUpdatedAt: '2026-09-28T01:00:00Z' } });
    await pending;
    expect(JSON.parse(localStorage.getItem('mindloop:favorites')!)).toEqual([]);
  });
  it('retries a failed save while retaining local progress', async () => {
    api.sync.mockRejectedValueOnce(new Error('offline')).mockImplementation(async (snapshot) => ({ player: { ...snapshot, updatedAt: null } }));
    const sync = await import('./player-sync');
    await sync.initPlayerSync();
    expect(sync.getSyncState()).toBe('pending');
    await vi.advanceTimersByTimeAsync(2000);
    expect(sync.getSyncState()).toBe('saved');
  });
});
