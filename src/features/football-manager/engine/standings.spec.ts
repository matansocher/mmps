import { describe, expect, it } from 'vitest';
import { computeStandings } from './standings';
import type { FixtureDocument, TeamDocument } from '../types';

function team(id: number, name: string): TeamDocument {
  return { _id: id, eaTeamId: id, name, leagueId: 13, leagueName: 'Premier League', logoUrl: `logo-${id}`, overall: 80, playerCount: 25 };
}

function played(home: number, away: number, hg: number, ag: number): FixtureDocument {
  return { careerId: 'c', leagueId: 13, seasonNumber: 1, matchday: 1, homeTeamId: home, awayTeamId: away, isUserMatch: false, played: true, homeGoals: hg, awayGoals: ag, playedAt: new Date() };
}

describe('computeStandings()', () => {
  const teams = [team(1, 'Alpha'), team(2, 'Bravo'), team(3, 'Charlie')];

  it('awards 3 points for a win, 1 for a draw, 0 for a loss', () => {
    const table = computeStandings(teams, [played(1, 2, 2, 0), played(2, 3, 1, 1)]);
    const byId = new Map(table.map((r) => [r.teamId, r]));
    expect(byId.get(1)?.points).toEqual(3);
    expect(byId.get(2)?.points).toEqual(1);
    expect(byId.get(3)?.points).toEqual(1);
  });

  it('tracks goals for/against and goal difference', () => {
    const table = computeStandings(teams, [played(1, 2, 3, 1)]);
    const alpha = table.find((r) => r.teamId === 1)!;
    expect(alpha.goalsFor).toEqual(3);
    expect(alpha.goalsAgainst).toEqual(1);
    expect(alpha.goalDifference).toEqual(2);
  });

  it('sorts by points then goal difference', () => {
    const table = computeStandings(teams, [played(1, 3, 1, 0), played(2, 3, 5, 0)]);
    // Both 1 and 2 have 3 points; 2 has better GD, so 2 is first.
    expect(table[0].teamId).toEqual(2);
    expect(table[1].teamId).toEqual(1);
  });

  it('ignores unplayed fixtures', () => {
    const unplayed: FixtureDocument = { ...played(1, 2, 0, 0), played: false, homeGoals: null, awayGoals: null };
    const table = computeStandings(teams, [unplayed]);
    expect(table.every((r) => r.played === 0)).toBe(true);
  });
});
