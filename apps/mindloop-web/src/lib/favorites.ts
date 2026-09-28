import { syncFavorites } from './player-sync';
import { readJson, removeJson, writeJson } from './progress';

const FAV_KEY = 'mindloop:favorites';

function read(): string[] {
  return readJson<string[]>(FAV_KEY, []);
}
function write(ids: string[]): void {
  writeJson(FAV_KEY, ids);
  syncFavorites();
  window.dispatchEvent(new Event('mindloop:data'));
}

export function getFavorites(): string[] {
  return read();
}

export function isFavorite(gameId: string): boolean {
  return read().includes(gameId);
}

/** Toggles favorite state and returns the new state. */
export function toggleFavorite(gameId: string): boolean {
  const ids = read();
  const idx = ids.indexOf(gameId);
  if (idx >= 0) {
    ids.splice(idx, 1);
    write(ids);
    return false;
  }
  ids.push(gameId);
  write(ids);
  return true;
}

export function clearFavorites(): void {
  try {
    removeJson(FAV_KEY);
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event('mindloop:data'));
}
