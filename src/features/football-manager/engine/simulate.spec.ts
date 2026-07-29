import { describe, expect, it } from 'vitest';
import { createRng, hashSeed, simulateMatch } from './index';
import type { SimTeamInput } from './types';

function team(teamId: number, overall: number): SimTeamInput {
  return {
    teamId,
    overall,
    scorers: [
      { playerId: teamId * 10 + 1, name: 'Striker', overall: overall + 2, isAttacker: true },
      { playerId: teamId * 10 + 2, name: 'Midfielder', overall, isAttacker: true },
      { playerId: teamId * 10 + 3, name: 'Defender', overall: overall - 5, isAttacker: false },
    ],
  };
}

describe('createRng()', () => {
  it('is deterministic for a given seed', () => {
    const a = createRng(123);
    const b = createRng(123);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });

  it('produces values in [0, 1)', () => {
    const rng = createRng(42);
    for (let i = 0; i < 1000; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe('hashSeed()', () => {
  it('is stable for the same string', () => {
    expect(hashSeed('man-city-vs-arsenal')).toEqual(hashSeed('man-city-vs-arsenal'));
  });

  it('differs for different strings', () => {
    expect(hashSeed('a')).not.toEqual(hashSeed('b'));
  });
});

describe('simulateMatch()', () => {
  it('is deterministic given the same seed and inputs', () => {
    const home = team(1, 80);
    const away = team(2, 75);
    const first = simulateMatch(home, away, 'fixture-1');
    const second = simulateMatch(home, away, 'fixture-1');
    expect(first).toEqual(second);
  });

  it('attributes every goal to a scorer on the scoring team', () => {
    const home = team(1, 85);
    const away = team(2, 60);
    const result = simulateMatch(home, away, 'fixture-2');
    const goalCountByTeam = { [home.teamId]: 0, [away.teamId]: 0 };
    for (const goal of result.goals) {
      expect([home.teamId, away.teamId]).toContain(goal.teamId);
      goalCountByTeam[goal.teamId]++;
    }
    expect(goalCountByTeam[home.teamId]).toEqual(result.homeGoals);
    expect(goalCountByTeam[away.teamId]).toEqual(result.awayGoals);
  });

  it('keeps goal minutes within a match and sorted', () => {
    const result = simulateMatch(team(1, 78), team(2, 78), 'fixture-3');
    for (const goal of result.goals) {
      expect(goal.minute).toBeGreaterThanOrEqual(1);
      expect(goal.minute).toBeLessThanOrEqual(90);
    }
    const minutes = result.goals.map((g) => g.minute);
    expect(minutes).toEqual([...minutes].sort((a, b) => a - b));
  });

  it('favours the much stronger team on average', () => {
    const strong = team(1, 88);
    const weak = team(2, 58);
    let strongWins = 0;
    let weakWins = 0;
    for (let i = 0; i < 200; i++) {
      const result = simulateMatch(strong, weak, `sample-${i}`);
      if (result.homeGoals > result.awayGoals) strongWins++;
      else if (result.awayGoals > result.homeGoals) weakWins++;
    }
    expect(strongWins).toBeGreaterThan(weakWins * 2);
  });
});
