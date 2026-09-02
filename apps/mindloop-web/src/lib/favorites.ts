import { syncFavorites } from './player-sync';

const FAV_KEY = 'mindloop:favorites';

function read(): string[] {
  try {
    const raw = localStorage.getItem(FAV_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function write(ids: string[]) {
  try {
    localStorage.setItem(FAV_KEY, JSON.stringify(ids));
  } catch {
    /* ignore */
  }
  syncFavorites(ids);
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
    localStorage.removeItem(FAV_KEY);
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event('mindloop:data'));
}
