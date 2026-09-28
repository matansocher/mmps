import { track } from './analytics';
import { hasRemoteIdentity, mindloopApi } from './api';
import type { PlayerData } from './api';
import { getProgress, hasStorageFailure, mergeRunHistory, mergeSavedProgress, readJson, removeJson, withProgressLock, writeJson } from './progress';
import { newId } from './utils';

export type SyncState = 'device' | 'syncing' | 'saved' | 'pending' | 'storage-error';
let state: SyncState = 'device';
let inFlight: Promise<void> | null = null;
let retry: number | undefined;
let attempts = 0;
function setState(next: SyncState) {
  state = next;
  window.dispatchEvent(new Event('mindloop:data'));
}
export function getSyncState(): SyncState {
  return state;
}
export function syncLabel(): string {
  if (hasStorageFailure()) return state === 'saved' ? 'Saved to Telegram · device storage unavailable' : 'Device storage unavailable · keep this page open';
  return {
    device: 'Saved on this device',
    syncing: 'Saving your progress…',
    saved: 'Saved to your Telegram account',
    pending: 'Saved here · waiting to sync',
    'storage-error': 'Storage unavailable · keep this page open',
  }[state];
}
function snapshot(): Omit<PlayerData, 'updatedAt'> {
  return {
    bestScores: readJson('mindloop:best-scores', {}),
    favorites: readJson('mindloop:favorites', []),
    history: readJson('mindloop:history', []),
    progress: getProgress(),
    favoritesUpdatedAt: readJson('mindloop:favorites-at', undefined),
  };
}
export async function reconcileSnapshot(player: PlayerData): Promise<void> {
  await withProgressLock(() => {
    const local = snapshot();
    const bestScores = { ...player.bestScores };
    for (const [id, score] of Object.entries(local.bestScores)) bestScores[id] = Math.max(bestScores[id] ?? 0, score);
    writeJson('mindloop:best-scores', bestScores);
    writeJson('mindloop:history', mergeRunHistory(local.history, player.history));
    mergeSavedProgress(player.progress);
    if ((player.favoritesUpdatedAt ?? '') >= (local.favoritesUpdatedAt ?? '')) {
      writeJson('mindloop:favorites', player.favorites);
      writeJson('mindloop:favorites-at', player.favoritesUpdatedAt);
    }
    window.dispatchEvent(new Event('mindloop:data'));
  });
}
async function flush(): Promise<void> {
  if (!hasRemoteIdentity()) {
    setState('device');
    return;
  }
  const marker = readJson<string | null>('mindloop:pending-sync', null);
  setState('syncing');
  try {
    const { player } = await mindloopApi.sync(snapshot());
    await reconcileSnapshot(player);
    attempts = 0;
    if (marker === readJson('mindloop:pending-sync', null)) {
      removeJson('mindloop:pending-sync');
      setState('saved');
    } else {
      setState('pending');
      retry = window.setTimeout(() => void initPlayerSync(), 100);
    }
  } catch {
    track('sync_failed');
    setState('pending');
    retry = window.setTimeout(() => void initPlayerSync(), Math.min(60000, 2000 * 2 ** Math.min(attempts++, 5)));
  }
}
export async function initPlayerSync(): Promise<void> {
  if (inFlight) return inFlight;
  window.clearTimeout(retry);
  inFlight = flush();
  try {
    await inFlight;
  } finally {
    inFlight = null;
  }
}
export function syncResult(): void {
  writeJson('mindloop:pending-sync', newId());
  void initPlayerSync();
}
export function syncFavorites(): void {
  writeJson('mindloop:favorites-at', new Date().toISOString());
  syncResult();
}
export function startPlayerSync(): () => void {
  const update = () => void initPlayerSync();
  const storageError = () => setState('storage-error');
  window.addEventListener('online', update);
  window.addEventListener('focus', update);
  window.addEventListener('mindloop:storage-error', storageError);
  update();
  return () => {
    window.clearTimeout(retry);
    window.removeEventListener('online', update);
    window.removeEventListener('focus', update);
    window.removeEventListener('mindloop:storage-error', storageError);
  };
}
