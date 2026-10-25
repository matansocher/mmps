import { useEffect, useRef, useState } from 'react';
import type { Game, Side } from '../types';

const FLASH_MS = 8000;
const REGULATION_MINUTES = 90;

// Returns the side that just scored (only for score increases seen while mounted), cleared after FLASH_MS.
export function useGoalFlash(game: Game): Side | null {
  const [side, setSide] = useState<Side | null>(null);
  const prev = useRef({ home: game.home.score, away: game.away.score });

  useEffect(() => {
    const before = prev.current;
    prev.current = { home: game.home.score, away: game.away.score };
    if (game.status !== 'live') return;
    const scored: Side | null = (game.home.score ?? 0) > (before.home ?? 0) ? 'home' : (game.away.score ?? 0) > (before.away ?? 0) ? 'away' : null;
    if (before.home !== null && before.away !== null && scored) setSide(scored);
  }, [game.home.score, game.away.score, game.status]);

  useEffect(() => {
    if (!side) return;
    const timer = window.setTimeout(() => setSide(null), FLASH_MS);
    return () => window.clearTimeout(timer);
  }, [side, game.home.score, game.away.score]);

  return side;
}

export function LiveProgress({ game, hot }: { readonly game: Game; readonly hot?: boolean }) {
  if (game.status !== 'live') return null;
  const minute = game.minute ?? (parseInt(game.minuteDisplay ?? '', 10) || 0);
  const progress = Math.min(minute / REGULATION_MINUTES, 1);
  return (
    <span aria-hidden className={`pointer-events-none absolute inset-x-0 top-0 h-0.5 overflow-hidden rounded-t-[inherit] ${hot ? 'bg-accent-hot/15' : 'bg-accent-live/15'}`}>
      <span className={`block h-full origin-left ${hot ? 'hot-progress' : 'bg-accent-live'} transition-transform duration-700 rtl:origin-right`} style={{ transform: `scaleX(${progress})` }} />
    </span>
  );
}
