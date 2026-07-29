import { describe, expect, it } from 'vitest';
import { resultFromTimeline, simulateTimeline, FULL_TIME_MINUTE, type MatchDecision } from './index';
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

describe('simulateTimeline()', () => {
  it('is deterministic for a given seed and decisions', () => {
    const home = team(1, 82);
    const away = team(2, 76);
    const a = simulateTimeline(home, away, 'fixture-1');
    const b = simulateTimeline(home, away, 'fixture-1');
    expect(a).toEqual(b);
  });

  it('opens with a kickoff and ends with fulltime, in minute order', () => {
    const t = simulateTimeline(team(1, 80), team(2, 80), 'fixture-2');
    expect(t.events[0].type).toEqual('kickoff');
    expect(t.events[t.events.length - 1].type).toEqual('fulltime');
    const minutes = t.events.map((e) => e.minute);
    expect(minutes).toEqual([...minutes].sort((x, y) => x - y));
    expect(t.events.some((e) => e.type === 'halftime')).toBe(true);
  });

  it('running score on the final event equals the tallied goals', () => {
    const t = simulateTimeline(team(1, 85), team(2, 62), 'fixture-3');
    const last = t.events[t.events.length - 1];
    expect(last.homeGoals).toEqual(t.homeGoals);
    expect(last.awayGoals).toEqual(t.awayGoals);
    const home = t.goals.filter((g) => g.teamId === 1).length;
    const away = t.goals.filter((g) => g.teamId === 2).length;
    expect(home).toEqual(t.homeGoals);
    expect(away).toEqual(t.awayGoals);
  });

  it('emits a ball frame for every minute within the pitch bounds', () => {
    const t = simulateTimeline(team(1, 78), team(2, 78), 'fixture-4');
    expect(t.frames).toHaveLength(FULL_TIME_MINUTE);
    for (const f of t.frames) {
      expect(f.minute).toBeGreaterThanOrEqual(1);
      expect(f.minute).toBeLessThanOrEqual(FULL_TIME_MINUTE);
      expect(f.x).toBeGreaterThanOrEqual(0);
      expect(f.x).toBeLessThanOrEqual(1);
      expect(f.y).toBeGreaterThanOrEqual(0);
      expect(f.y).toBeLessThanOrEqual(1);
    }
  });

  it('attributes every goal to a scorer on the scoring team', () => {
    const home = team(1, 88);
    const away = team(2, 60);
    const t = simulateTimeline(home, away, 'fixture-5');
    const ids = new Set([...home.scorers, ...away.scorers].map((s) => s.playerId));
    for (const g of t.goals) {
      expect([1, 2]).toContain(g.teamId);
      expect(ids.has(g.playerId)).toBe(true);
    }
  });

  it('keeps past events fixed when a decision is applied mid-match', () => {
    const home = team(1, 80);
    const away = team(2, 80);
    const baseline = simulateTimeline(home, away, 'fixture-6');
    const decisions: MatchDecision[] = [{ minute: 60, side: 'home', mentality: 'attacking', overallDelta: 3 }];
    const altered = simulateTimeline(home, away, 'fixture-6', decisions);
    // Every event strictly before minute 60 must be identical.
    const before = (evts: typeof baseline.events) => evts.filter((e) => e.minute < 60);
    expect(before(altered.events)).toEqual(before(baseline.events));
  });

  it('attacking mentality increases the deciding team goals on average', () => {
    let attackingGoals = 0;
    let balancedGoals = 0;
    for (let i = 0; i < 120; i++) {
      const home = team(1, 78);
      const away = team(2, 78);
      const seed = `ment-${i}`;
      balancedGoals += simulateTimeline(home, away, seed).homeGoals;
      attackingGoals += simulateTimeline(home, away, seed, [{ minute: 1, side: 'home', mentality: 'attacking' }]).homeGoals;
    }
    expect(attackingGoals).toBeGreaterThan(balancedGoals);
  });

  it('favours the much stronger team on average', () => {
    let strongWins = 0;
    let weakWins = 0;
    for (let i = 0; i < 200; i++) {
      const t = simulateTimeline(team(1, 88), team(2, 58), `sample-${i}`);
      if (t.homeGoals > t.awayGoals) strongWins++;
      else if (t.awayGoals > t.homeGoals) weakWins++;
    }
    expect(strongWins).toBeGreaterThan(weakWins * 2);
  });
});

describe('resultFromTimeline()', () => {
  it('matches the tally of the underlying timeline', () => {
    const home = team(1, 84);
    const away = team(2, 70);
    const r = resultFromTimeline(home, away, 'fixture-7');
    const t = simulateTimeline(home, away, 'fixture-7');
    expect(r.homeGoals).toEqual(t.homeGoals);
    expect(r.awayGoals).toEqual(t.awayGoals);
    expect(r.goals).toEqual(t.goals);
  });
});

describe('timeline stats + player frames', () => {
  it('emits 22 player dots per minute within the pitch bounds', () => {
    const t = simulateTimeline(team(1, 80), team(2, 78), 'stats-1');
    expect(t.playerFrames).toHaveLength(FULL_TIME_MINUTE);
    for (const f of t.playerFrames) {
      expect(f.home).toHaveLength(11);
      expect(f.away).toHaveLength(11);
      for (const dot of [...f.home, ...f.away]) {
        expect(dot.x).toBeGreaterThanOrEqual(0);
        expect(dot.x).toBeLessThanOrEqual(1);
        expect(dot.y).toBeGreaterThanOrEqual(0);
        expect(dot.y).toBeLessThanOrEqual(1);
      }
    }
  });

  it('possession percentages sum to 100 in every stats frame', () => {
    const t = simulateTimeline(team(1, 82), team(2, 74), 'stats-2');
    expect(t.statsFrames).toHaveLength(FULL_TIME_MINUTE);
    for (const s of t.statsFrames) {
      expect(s.home.possessionPct + s.away.possessionPct).toEqual(100);
    }
  });

  it('cumulative counting stats are monotonic non-decreasing', () => {
    const t = simulateTimeline(team(1, 80), team(2, 80), 'stats-3');
    const keys = ['shots', 'shotsOnTarget', 'passes', 'tackles', 'corners', 'fouls'] as const;
    for (let i = 1; i < t.statsFrames.length; i++) {
      for (const side of ['home', 'away'] as const) {
        for (const k of keys) {
          expect(t.statsFrames[i][side][k]).toBeGreaterThanOrEqual(t.statsFrames[i - 1][side][k]);
        }
      }
    }
  });

  it('shots on target never exceed shots', () => {
    const t = simulateTimeline(team(1, 86), team(2, 62), 'stats-4');
    for (const s of t.statsFrames) {
      expect(s.home.shotsOnTarget).toBeLessThanOrEqual(s.home.shots);
      expect(s.away.shotsOnTarget).toBeLessThanOrEqual(s.away.shots);
    }
  });

  it('final shots are at least the number of goals scored', () => {
    const t = simulateTimeline(team(1, 88), team(2, 58), 'stats-5');
    const last = t.statsFrames[t.statsFrames.length - 1];
    expect(last.home.shots).toBeGreaterThanOrEqual(t.homeGoals);
    expect(last.away.shots).toBeGreaterThanOrEqual(t.awayGoals);
  });

  it('keeps past stats frames fixed when a decision is applied mid-match', () => {
    const home = team(1, 80);
    const away = team(2, 80);
    const baseline = simulateTimeline(home, away, 'stats-6');
    const altered = simulateTimeline(home, away, 'stats-6', [{ minute: 60, side: 'home', mentality: 'attacking', overallDelta: 3 }]);
    const before = (frames: typeof baseline.statsFrames) => frames.filter((s) => s.minute < 60);
    expect(before(altered.statsFrames)).toEqual(before(baseline.statsFrames));
  });
});
