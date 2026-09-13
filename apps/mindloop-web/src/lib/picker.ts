/**
 * Client-side "coach" that decides which game to serve next, so the user can
 * just tap Play instead of choosing from the catalog.
 *
 * Balancing is category-first: it steers the user toward their least-trained
 * skill, then toward the least-played game within that skill. Everything is
 * derived from the local play history — no backend, consistent with the rest
 * of the offline-first design.
 */
import { CATEGORIES, CATEGORY_ORDER } from './categories';
import { GAMES } from './games';
import type { GameEntry } from './games';
import { getHistory } from './history';
import type { PlayEntry } from './history';
import type { CategoryId } from './types';
import { pick } from './utils';

export type PickOptions = {
  /** Game id to avoid returning (e.g. the one just played). */
  exclude?: string;
};

type Tally = {
  /** Number of times played. */
  count: number;
  /** Epoch ms of the most recent play, or 0 if never played. */
  last: number;
};

/** Ranking key used to compare candidates: lower score wins. */
type Rank = {
  /** Primary metric — lower is less trained. */
  score: number;
  /** Tie-break — older (smaller) last-played time wins. */
  last: number;
};

function emptyTally(): Tally {
  return { count: 0, last: 0 };
}

/** Per-game play tallies keyed by game id (includes never-played games). */
function gameTallies(history: PlayEntry[]): Map<string, Tally> {
  const tallies = new Map<string, Tally>();
  for (const g of GAMES) tallies.set(g.id, emptyTally());

  for (const entry of history) {
    const t = tallies.get(entry.gameId);
    if (!t) continue; // ignore history for games that no longer exist
    t.count += 1;
    const at = new Date(entry.at).getTime();
    if (at > t.last) t.last = at;
  }
  return tallies;
}

/**
 * Per-category ranking by AVERAGE plays per game (not sum), so categories with
 * different game counts compete fairly — steering toward the least-trained
 * skill regardless of how many games it contains.
 */
function categoryRanks(games: Map<string, Tally>): Map<CategoryId, Rank> {
  const ranks = new Map<CategoryId, Rank>();

  for (const catId of CATEGORY_ORDER) {
    const catGames = GAMES.filter((g) => g.category === catId);
    let total = 0;
    let last = 0;
    for (const g of catGames) {
      const gt = games.get(g.id) ?? emptyTally();
      total += gt.count;
      if (gt.last > last) last = gt.last;
    }
    const score = catGames.length > 0 ? total / catGames.length : 0;
    ranks.set(catId, { score, last });
  }
  return ranks;
}

/**
 * From a list of candidates, keep those with the smallest score, then the
 * smallest (oldest) last-played time, then break remaining ties randomly.
 */
function leastTrained<T>(candidates: T[], rankOf: (c: T) => Rank): T {
  const minScore = Math.min(...candidates.map((c) => rankOf(c).score));
  let pool = candidates.filter((c) => rankOf(c).score === minScore);

  const minLast = Math.min(...pool.map((c) => rankOf(c).last));
  pool = pool.filter((c) => rankOf(c).last === minLast);

  return pool.length === 1 ? pool[0] : pick(pool);
}

/**
 * Pure picker over an explicit history: least-trained skill first, then the
 * least-played game within it. Avoids returning `exclude` when a real
 * alternative exists so Play never re-serves the game just finished.
 * Exported for testability; app code should use `pickNextGame`.
 */
export function chooseFrom(history: PlayEntry[], opts: PickOptions = {}): GameEntry {
  const games = gameTallies(history);
  const cats = categoryRanks(games);

  const chosenCat = leastTrained(CATEGORY_ORDER, (c) => cats.get(c) ?? { score: 0, last: 0 });

  let candidates = GAMES.filter((g) => g.category === chosenCat);
  // Only drop the excluded game if doing so still leaves a choice — otherwise
  // it's the only game in its (least-trained) category and we serve it anyway.
  if (opts.exclude && candidates.length > 1) {
    candidates = candidates.filter((g) => g.id !== opts.exclude);
  }

  return leastTrained(candidates, (g) => {
    const t = games.get(g.id) ?? emptyTally();
    return { score: t.count, last: t.last };
  });
}

/** Picks the next game to play from the local play history. */
export function pickNextGame(opts: PickOptions = {}): GameEntry {
  return chooseFrom(getHistory(), opts);
}

/** Whether the user has never played this game. */
export function isNewGame(gameId: string): boolean {
  return !getHistory().some((e) => e.gameId === gameId);
}

/** Count of distinct games explored, out of the full catalog. */
export function getExploredCount(): { explored: number; total: number } {
  const played = new Set(getHistory().map((e) => e.gameId));
  const explored = GAMES.filter((g) => played.has(g.id)).length;
  return { explored, total: GAMES.length };
}

/** Short coaching reason shown on the reveal card. */
export function pickReason(game: GameEntry): string {
  const label = CATEGORIES[game.category].label;
  if (isNewGame(game.id)) return `A new challenge for you — ${label}`;
  return `Time to train your ${label}`;
}
