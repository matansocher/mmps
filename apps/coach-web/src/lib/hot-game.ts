import type { Game, GameEvent, Side } from '../types';

export type HotReason = 'lateDrama' | 'comeback' | 'goalFest' | 'redCardTension';

const LATE_MINUTE = 85;
const GOAL_FEST = 5;
const CLOSE_MARGIN = 1;
// Finished games stay "hot" for a while after the final whistle (kick-off + ~2h of play + 1h).
const RECENT_FINISH_MS = 3 * 60 * 60_000;

function goalsInOrder(events: readonly GameEvent[]): GameEvent[] {
  return events
    .map((event, index) => ({ event, index }))
    .filter(({ event }) => event.type === 'goal')
    .sort((a, b) => a.event.minute - b.event.minute || a.index - b.index)
    .map(({ event }) => event);
}

// A side that was behind and is now ahead, or that came back from two goals down to level.
function isComeback(game: Game, home: number, away: number): boolean {
  const deficit: Record<Side, number> = { home: 0, away: 0 };
  const score: Record<Side, number> = { home: 0, away: 0 };
  for (const goal of goalsInOrder(game.events)) {
    score[goal.side] += 1;
    deficit.home = Math.max(deficit.home, score.away - score.home);
    deficit.away = Math.max(deficit.away, score.home - score.away);
  }
  // Only trust the replay when it reaches the real score.
  if (score.home !== home || score.away !== away) return false;
  return (deficit.home > 0 && home > away) || (deficit.away > 0 && away > home) || (Math.max(deficit.home, deficit.away) >= 2 && home === away);
}

export function hotReason(game: Game, now: number = Date.now()): HotReason | null {
  const recentlyFinished = game.status === 'finished' && now - new Date(game.startTime).getTime() <= RECENT_FINISH_MS;
  if (game.status !== 'live' && !recentlyFinished) return null;
  const home = game.home.score ?? 0;
  const away = game.away.score ?? 0;
  if (game.events.some((e) => e.type === 'goal' && e.minute >= LATE_MINUTE)) return 'lateDrama';
  if (isComeback(game, home, away)) return 'comeback';
  if (home + away >= GOAL_FEST) return 'goalFest';
  if (game.events.some((e) => e.type === 'redCard') && Math.abs(home - away) <= CLOSE_MARGIN) return 'redCardTension';
  return null;
}
