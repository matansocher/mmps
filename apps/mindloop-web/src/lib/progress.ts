import { addProgressRun, awardProgress, EMPTY_PROGRESS, mergeProgress, progressFromHistory } from '../../../../src/shared/mindloop/progress';
import type { PlayerProgress, RunRecord } from '../../../../src/shared/mindloop/progress';
import { newId } from './utils';

export * from '../../../../src/shared/mindloop/progress';

const fallback = new Map<string, unknown>();
let storageFailed = false;
export function hasStorageFailure(): boolean {
  return storageFailed;
}
export function readJson<T>(key: string, defaultValue: T): T {
  if (fallback.has(key)) return fallback.get(key) as T;
  try {
    return JSON.parse(localStorage.getItem(key) ?? 'null') ?? defaultValue;
  } catch {
    return defaultValue;
  }
}
export function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    fallback.delete(key);
  } catch {
    fallback.set(key, value);
    if (!storageFailed) {
      storageFailed = true;
      window.dispatchEvent(new Event('mindloop:storage-error'));
    }
  }
}
export function removeJson(key: string): void {
  fallback.delete(key);
  try {
    localStorage.removeItem(key);
  } catch {
    /* In-memory data is already cleared. */
  }
}
export function getProgress(): PlayerProgress {
  const saved = readJson<PlayerProgress | null>('mindloop:progress', null);
  if (saved?.sources && saved?.awards && saved?.records) return saved;
  let migrated = progressFromHistory(readJson<RunRecord[]>('mindloop:history', []));
  const top = Math.max(0, ...Object.values(readJson<Record<string, number>>('mindloop:best-scores', {})));
  migrated = { ...migrated, awards: { ...migrated.awards, ...(top >= 500 ? { 'high-scorer': new Date().toISOString() } : {}), ...(top >= 1000 ? { elite: new Date().toISOString() } : {}) } };
  writeJson('mindloop:progress', migrated);
  return migrated;
}
export function saveProgress(progress: PlayerProgress): void {
  writeJson('mindloop:progress', awardProgress(progress, new Date().toISOString()));
}
export function mergeSavedProgress(progress: PlayerProgress = EMPTY_PROGRESS): void {
  saveProgress(mergeProgress(getProgress(), progress));
}
export function recordProgress(run: RunRecord): void {
  let source = readJson<string | null>('mindloop:device', null);
  if (!source) {
    source = newId();
    writeJson('mindloop:device', source);
  }
  saveProgress(addProgressRun(getProgress(), source, run));
}

export { GAME_MILESTONES } from '../../../../src/shared/mindloop/milestones';

export async function withProgressLock(action: () => void): Promise<void> {
  if (typeof navigator !== 'undefined' && navigator.locks) {
    try {
      await navigator.locks.request('mindloop:progress', action);
      return;
    } catch {
      /* Restricted WebViews may expose locks without permitting them. */
    }
  }
  action();
}
