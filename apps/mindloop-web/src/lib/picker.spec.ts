import { describe, expect, it } from 'vitest';
import { CATEGORIES } from './categories';
import { GAMES } from './games';
import { chooseFrom } from './picker';
import type { PlayEntry } from './history';

function play(gameId: string, at = '2026-01-01T00:00:00.000Z'): PlayEntry {
  return { gameId, score: 1, at };
}

/** All game ids grouped by their category. */
function idsByCategory(category: string): string[] {
  return GAMES.filter((g) => g.category === category).map((g) => g.id);
}

describe('chooseFrom()', () => {
  it('returns a real game from the catalog', () => {
    const g = chooseFrom([]);
    expect(GAMES.some((x) => x.id === g.id)).toBe(true);
  });

  it('picks from the least-played category', () => {
    // Play every game except those in flexibility a bunch, leaving
    // flexibility as the clearly least-trained skill.
    const history: PlayEntry[] = [];
    for (const g of GAMES) {
      if (g.category === 'flexibility') continue;
      history.push(play(g.id), play(g.id), play(g.id));
    }

    const chosen = chooseFrom(history);
    expect(chosen.category).toBe('flexibility');
  });

  it('within the chosen category, picks the least-played game', () => {
    // Make memory the least-trained category overall by heavily playing the
    // others, then within memory play all but one game once.
    const history: PlayEntry[] = [];
    for (const g of GAMES) {
      if (g.category === 'memory') continue;
      history.push(play(g.id), play(g.id), play(g.id), play(g.id), play(g.id));
    }
    const memoryIds = idsByCategory('memory');
    const untouched = memoryIds[0];
    for (const id of memoryIds.slice(1)) history.push(play(id), play(id));

    const chosen = chooseFrom(history);
    expect(chosen.category).toBe('memory');
    expect(chosen.id).toBe(untouched);
  });

  it('evens out skills over a long balanced session', () => {
    // Simulate always following the picker and recording the result. Category
    // balancing equalizes AVERAGE plays per game across skills — so every game
    // gets played and the per-category averages stay tight (even though a
    // single-game category is naturally played more per game than a 4-game one).
    const history: PlayEntry[] = [];
    let last: string | undefined;
    let clock = Date.parse('2026-01-01T00:00:00.000Z');
    for (let i = 0; i < GAMES.length * 6; i++) {
      const g = chooseFrom(history, { exclude: last });
      clock += 1000;
      history.push(play(g.id, new Date(clock).toISOString()));
      last = g.id;
    }

    const gameCounts = GAMES.map((g) => history.filter((h) => h.gameId === g.id).length);
    expect(Math.min(...gameCounts)).toBeGreaterThan(0); // every game played

    const categoryIds = Array.from(new Set(GAMES.map((g) => g.category)));
    const avgPerCategory = categoryIds.map((cat) => {
      const ids = idsByCategory(cat);
      const total = ids.reduce((sum, id) => sum + history.filter((h) => h.gameId === id).length, 0);
      return total / ids.length;
    });
    // Average plays per game per skill should be close across all 5 skills.
    expect(Math.max(...avgPerCategory) - Math.min(...avgPerCategory)).toBeLessThanOrEqual(1);
  });

  it('excludes the given game when an alternative exists', () => {
    // Drive the picker toward a specific multi-game category, then confirm the
    // excluded id is never returned when siblings are available.
    const history: PlayEntry[] = [];
    for (const g of GAMES) {
      if (g.category === 'memory') continue;
      history.push(play(g.id), play(g.id), play(g.id), play(g.id), play(g.id));
    }
    const memoryIds = idsByCategory('memory');
    expect(memoryIds.length).toBeGreaterThan(1);

    for (let i = 0; i < 20; i++) {
      const chosen = chooseFrom(history, { exclude: memoryIds[0] });
      expect(chosen.id).not.toBe(memoryIds[0]);
    }
  });

  it('every category has at least one game (picker invariant)', () => {
    for (const catId of Object.keys(CATEGORIES)) {
      expect(idsByCategory(catId).length).toBeGreaterThan(0);
    }
  });
});
