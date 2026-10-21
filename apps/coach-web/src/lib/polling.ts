import type { Game } from '../types';

export const LIVE_POLL_MS = 30_000;
export const IDLE_POLL_MS = 5 * 60_000;

// Poll fast while a game is live; otherwise slowly, but wake up in time for the next kickoff.
export function nextPollDelayMs(games: readonly Game[], now = Date.now()): number {
  if (games.some((g) => g.status === 'live')) return LIVE_POLL_MS;
  const nextKickoff = Math.min(...games.filter((g) => g.status === 'scheduled').map((g) => new Date(g.startTime).getTime()));
  if (!Number.isFinite(nextKickoff)) return IDLE_POLL_MS;
  return Math.min(IDLE_POLL_MS, Math.max(LIVE_POLL_MS, nextKickoff - now));
}
