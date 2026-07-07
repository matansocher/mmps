import type { League } from '../types';
import type { PickResult } from './scoring';
import { roundOrderFor } from './playoffs';
import { leagueConfig } from './leagues';

const GREEN = '🟩';
const RED = '🟥';

// Wordle-style, spoiler-free share card grouped by round.
export function buildShareText(league: League, year: number, results: readonly PickResult[], score: number, maxScore: number, streak: number): string {
  const cfg = leagueConfig(league);
  const byRound = roundOrderFor(league)
    .map((round) => results.filter((r) => r.series.round === round).map((r) => (r.correct ? GREEN : RED)).join(''))
    .filter((line) => line.length > 0);

  const flame = streak > 0 ? ` 🔥${streak}` : '';
  return [`${cfg.emoji} Playoff IQ — ${cfg.short} ${year}`, `${score}/${maxScore}${flame}`, ...byRound, '', 'playoff-iq'].join('\n');
}

export async function shareOrCopy(text: string): Promise<'shared' | 'copied' | 'failed'> {
  try {
    if (navigator.share) {
      await navigator.share({ text });
      return 'shared';
    }
  } catch {
    /* user cancelled or unsupported — fall through to copy */
  }
  try {
    await navigator.clipboard.writeText(text);
    return 'copied';
  } catch {
    return 'failed';
  }
}

// Spoiler-free Clutch Daily card: tournament emoji + ✅/❌ per question, no answers revealed.
export function buildDailyClutchShareText(dayNumber: number, correct: number, total: number, flags: readonly boolean[], leagues: readonly League[], streak: number): string {
  const grid = flags.map((ok, i) => `${leagueConfig(leagues[i]).emoji}${ok ? '✅' : '❌'}`).join(' ');
  const flame = streak > 0 ? ` 🔥${streak}` : '';
  return [`🏆 Clutch Daily #${dayNumber}`, `${correct}/${total}${flame}`, grid, '', 'Clutch'].join('\n');
}

// Spoiler-free Clutch Grid card: 3×3 of 🟩 (filled) / ⬛ (missed).
export function buildGridShareText(dayNumber: number, filled: number, score: number, cells: readonly boolean[], streak: number): string {
  const rows = [0, 1, 2].map((r) => cells.slice(r * 3, r * 3 + 3).map((ok) => (ok ? '🟩' : '⬛')).join(''));
  const flame = streak > 0 ? ` 🔥${streak}` : '';
  return [`🔲 Clutch Grid #${dayNumber}`, `${filled}/9 · ${score} pts${flame}`, ...rows, '', 'Clutch'].join('\n');
}
