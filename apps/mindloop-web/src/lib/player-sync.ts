/**
 * Bridges the local (localStorage) stores with the backend.
 *
 * Design goals:
 *  - localStorage stays the working store and offline fallback.
 *  - When a durable identity exists (Telegram, or a dev user in local dev) we
 *    reconcile once on startup and then push every durable change to the server.
 *  - Device-only preferences (theme, sound, reduced-motion) are NOT handled here
 *    — they live in settings.ts and never leave the device.
 */
import { hasRemoteIdentity, mindloopApi, type PlayerData } from './api';

const BEST_KEY = 'mindloop:best-scores';
const FAV_KEY = 'mindloop:favorites';
const HISTORY_KEY = 'mindloop:history';
const MAX_HISTORY = 200;

let started = false;

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function readBestScores(): Record<string, number> {
  const parsed = readJson<Record<string, number>>(BEST_KEY, {});
  return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
}

function readFavorites(): string[] {
  const parsed = readJson<string[]>(FAV_KEY, []);
  return Array.isArray(parsed) ? parsed : [];
}

function readHistory(): { gameId: string; score: number; at: string }[] {
  const parsed = readJson<{ gameId: string; score: number; at: string }[]>(HISTORY_KEY, []);
  return Array.isArray(parsed) ? parsed : [];
}

/** Overwrites local stores with the authoritative merged server snapshot. */
function applyServerSnapshot(player: PlayerData): void {
  try {
    localStorage.setItem(BEST_KEY, JSON.stringify(player.bestScores ?? {}));
    localStorage.setItem(FAV_KEY, JSON.stringify(player.favorites ?? []));
    localStorage.setItem(HISTORY_KEY, JSON.stringify((player.history ?? []).slice(0, MAX_HISTORY)));
  } catch {
    /* ignore quota / privacy-mode errors */
  }
  window.dispatchEvent(new Event('mindloop:data'));
}

/**
 * Reconciles local and server data once. Pushes the local snapshot (so
 * offline progress is not lost), then adopts the merged result the server
 * returns. Safe to call when there's no identity — it simply no-ops.
 */
export async function initPlayerSync(): Promise<void> {
  if (started || !hasRemoteIdentity()) return;
  started = true;

  try {
    const { player } = await mindloopApi.sync({
      bestScores: readBestScores(),
      favorites: readFavorites(),
      history: readHistory(),
    });
    applyServerSnapshot(player);
  } catch {
    // Offline / server error: keep using localStorage; a later change will retry.
    started = false;
  }
}

/** Fire-and-forget: persist a finished run server-side. */
export function syncResult(gameId: string, score: number): void {
  if (!hasRemoteIdentity()) return;
  mindloopApi.recordResult(gameId, score).catch(() => {
    /* best-effort; localStorage already holds the value */
  });
}

/** Fire-and-forget: persist the favorites list server-side. */
export function syncFavorites(favorites: string[]): void {
  if (!hasRemoteIdentity()) return;
  mindloopApi.setFavorites(favorites).catch(() => {
    /* best-effort */
  });
}
