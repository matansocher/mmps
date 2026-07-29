import { describe, expect, it } from 'vitest';
import { generateRoundRobin } from './schedule';

describe('generateRoundRobin()', () => {
  it('schedules every pair twice (home and away) for an even set', () => {
    const teams = [1, 2, 3, 4];
    const fixtures = generateRoundRobin(teams);

    // 4 teams -> 6 unique pairings -> 12 fixtures (double round-robin).
    expect(fixtures).toHaveLength(12);

    const seen = new Map<string, number>();
    for (const f of fixtures) {
      const key = `${f.homeTeamId}-${f.awayTeamId}`;
      seen.set(key, (seen.get(key) ?? 0) + 1);
    }
    // Each ordered pairing appears exactly once.
    expect([...seen.values()].every((c) => c === 1)).toBe(true);
    // Both venues covered for pair (1,2).
    expect(seen.has('1-2')).toBe(true);
    expect(seen.has('2-1')).toBe(true);
  });

  it('never schedules a team against itself', () => {
    const fixtures = generateRoundRobin([1, 2, 3, 4, 5, 6]);
    for (const f of fixtures) expect(f.homeTeamId).not.toEqual(f.awayTeamId);
  });

  it('gives each team the correct number of games', () => {
    const teams = [10, 20, 30, 40, 50, 60];
    const fixtures = generateRoundRobin(teams);
    const games = new Map<number, number>();
    for (const f of fixtures) {
      games.set(f.homeTeamId, (games.get(f.homeTeamId) ?? 0) + 1);
      games.set(f.awayTeamId, (games.get(f.awayTeamId) ?? 0) + 1);
    }
    // Each of 6 teams plays every other twice -> 10 games.
    for (const teamId of teams) expect(games.get(teamId)).toEqual(10);
  });

  it('handles an odd number of teams with a bye (no -1 leaks)', () => {
    const fixtures = generateRoundRobin([1, 2, 3, 4, 5]);
    for (const f of fixtures) {
      expect(f.homeTeamId).toBeGreaterThan(0);
      expect(f.awayTeamId).toBeGreaterThan(0);
    }
    // 5 teams -> each plays 4 opponents twice -> 8 games each -> 20 fixtures.
    expect(fixtures).toHaveLength(20);
  });

  it('produces balanced matchdays', () => {
    const fixtures = generateRoundRobin([1, 2, 3, 4]);
    const byMatchday = new Map<number, number>();
    for (const f of fixtures) byMatchday.set(f.matchday, (byMatchday.get(f.matchday) ?? 0) + 1);
    // 4 teams -> 6 matchdays, 2 games each.
    expect(byMatchday.size).toEqual(6);
    expect([...byMatchday.values()].every((c) => c === 2)).toBe(true);
  });
});
